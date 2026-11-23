#!/usr/bin/env python3
"""玄学系统精简 API server — 基于 kinastro 引擎
覆盖体系: 八字/紫微/策天飞星/三式(六壬·奇门)/皇极经世/七政四余/六爻终身卦/一掌经/铁板神数
用法: .venv/bin/python xuanxue_api.py [port]
"""
import sys, os, json, logging, importlib
import urllib.request, urllib.parse, urllib.error
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'kinastro'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'stub_packages'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'kinqimen_pkg'))  # 奇门包(kinqimen.kinqimen)

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional
from pathlib import Path

BASE_DIR = Path(__file__).parent
app = FastAPI(title="玄学系统 API", version="1.0.0")

# ── [P3 2026-09-22] 可观测层 ────────────────────────────────
# 目的：玄学/中医目前都缺"客观反馈信号"（不知道用户排了什么、推荐有没有被采纳），
# 将来要做学习闭环就没有原料。这里只先记录"发生了什么"，不做闭环。
# 隐私：不记 IP、不记姓名、不记生日原文，只记匿名指纹。
# 可观测层（可选）：设 XUANXUE_OBS_MODULE 指向你自己的日志模块，未设置则静默跳过。
# 设计原则：不记 IP、不记姓名、不记生日原文。
try:
    import importlib, os as _os
    _obs = importlib.import_module(_os.environ["XUANXUE_OBS_MODULE"]) if _os.environ.get("XUANXUE_OBS_MODULE") else None
    log_event = _obs.log_event if _obs else (lambda *a, **k: None)
except Exception:
    def log_event(*a, **k):
        return


@app.middleware("http")
async def _obs_mw(request, call_next):
    import time as _t
    t0 = _t.time()
    try:
        resp = await call_next(request)
        code = resp.status_code
    except Exception:
        code = 500
        raise
    finally:
        try:
            path = request.url.path
            if path.startswith("/api/"):
                body = {}
                system = None
                # 体系名：桥接口在 path 上，本地接口在末段
                if "/astro/" in path:
                    system = path.rsplit("/astro/", 1)[-1]
                elif path.startswith("/api/"):
                    system = path.rsplit("/", 1)[-1]
                log_event("xuanxue", "api_call", system=system, path=path,
                          method=request.method, ok=(code == 200), status=code,  # 302 等不算成功
                          ms=int((_t.time() - t0) * 1000))
        except Exception:
            pass
    return resp

logger = logging.getLogger("xuanxue")

# 静态前端（可选）：默认取仓库根目录，可用 XUANXUE_STATIC_DIR 覆盖。
# 目录不存在就不挂载 —— 否则 FastAPI 启动即报 RuntimeError，纯 API 模式用不了。
STATIC_DIR = Path(os.environ.get("XUANXUE_STATIC_DIR", str(BASE_DIR.parent)))
if (STATIC_DIR / "index.html").exists():
    app.mount("/app", StaticFiles(directory=str(STATIC_DIR), html=True), name="app")

    @app.get("/", include_in_schema=False)
    def index():
        return FileResponse(str(STATIC_DIR / "index.html"))

class BirthInput(BaseModel):
    year: int = Field(..., description="公历年份")
    month: int = Field(..., description="公历月份")
    day: int = Field(..., description="公历日期")
    hour: int = Field(..., description="小时(0-23)")
    minute: int = Field(0, description="分钟")
    gender: str = Field("男", description="男/女")
    timezone: float = Field(8.0, description="时区")
    latitude: float = Field(25.033, description="纬度")
    longitude: float = Field(121.565, description="经度")
    location_name: str = Field("", description="地点")

def to_serializable(obj):
    """递归转 JSON 可序列化"""
    if hasattr(obj, 'to_json'):
        return to_serializable(obj.to_json())
    if hasattr(obj, 'to_dict'):
        return to_serializable(obj.to_dict())
    if hasattr(obj, '__dict__'):
        return to_serializable(obj.__dict__)
    if isinstance(obj, dict):
        return {k: to_serializable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [to_serializable(v) for v in obj]
    if isinstance(obj, (str, int, float, bool)) or obj is None:
        return obj
    return str(obj)

def _engine(dotted):
    """按需导入上游引擎：`"包.模块:函数名"`。

    本仓**不打包**上游重型引擎（见 README 致谢）。缺依赖时给出可操作的 503，
    而不是让 FastAPI 抛一个没人看得懂的 ModuleNotFoundError。
    """
    mod_path, fn_name = dotted.split(":", 1)
    try:
        m = importlib.import_module(mod_path)
    except ModuleNotFoundError as e:
        raise HTTPException(status_code=503, detail=(
            f"缺少上游引擎 {mod_path}（{e}）。请先安装上游项目并把路径加进 PYTHONPATH，"
            f"例如 git clone <上游仓库> 后 PYTHONPATH=./kinastro python api/xuanxue_api.py"))
    fn = getattr(m, fn_name, None)
    if fn is None:
        raise HTTPException(status_code=503, detail=f"{mod_path} 里没有 {fn_name}，请检查上游版本")
    return fn


def safe(fn, *args, **kwargs):
    try:
        return to_serializable(fn(*args, **kwargs))
    except Exception as e:
        logger.exception("compute failed")
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}")

@app.get("/health")
def health():
    return {"status": "ok", "service": "xuanxue"}

# 可选的上游网关：把重型星象/天文计算放在另一个进程/机器上，这里只做统一请求模型的转发。
# 不设置就是纯本地模式（LOCAL_SYSTEMS 照常可用）。
GATEWAY = os.environ.get("XUANXUE_GATEWAY", "").rstrip("/")

# 本地直算的体系（进程内 import kinastro 引擎，最快）
LOCAL_SYSTEMS = [
        {"id": "bazi", "name": "子平八字", "desc": "四柱/十神/格局/用神/大运/神煞"},
        {"id": "ziwei", "name": "紫微斗数", "desc": "命宫/身宫/五行局/十四主星"},
        {"id": "cetian", "name": "策天飞星", "desc": "十八飞星/飞星四化"},
        {"id": "liuren", "name": "大六壬", "desc": "天地盘/四课/三传/格局"},
        {"id": "qimen", "name": "奇门遁甲", "desc": "八门/九星/八神/格局"},
        {"id": "huangji", "name": "皇极经世", "desc": "元会运世/先天四卦"},
        {"id": "qizheng", "name": "七政四余", "desc": "星曜宫位/神煞/张果星宗"},
        {"id": "liuyao", "name": "六爻终身卦", "desc": "纳甲排盘/六亲六神/大限流年"},
        {"id": "tieban", "name": "铁板神数", "desc": "八卦加则/条文查询"},
        {"id": "damo", "name": "达摩一掌经", "desc": "十二宫掌纹/前世今生"},
        {"id": "beiji", "name": "北极神数", "desc": "北斗七星/破军星/六十四卦/二十八宿"},
]


def _gateway_systems():
    """读上游网关的体系表。未配置或不可用时返回空表，本地体系照常可用（降级不报错）。"""
    if not GATEWAY:
        return []
    try:
        with urllib.request.urlopen(GATEWAY + "/systems", timeout=8) as r:
            d = json.loads(r.read().decode("utf-8"))
        out = []
        for s in d.get("systems", []):
            out.append({"id": s.get("id"), "name": s.get("name"),
                        "desc": s.get("cat") or "", "cat": s.get("cat"),
                        "origin": "gateway"})
        return out
    except Exception as e:
        logger.warning("星命网关 /systems 读取失败（本地体系不受影响）: %s", e)
        return []


@app.get("/systems")
def systems():
    """全部体系 = 本地直算 + 星命网关，合并去重后返回。

    设计意图：把「本地能算的」和「依赖上游网关的」合成一张体系表给前端，
    前端不用关心某个体系到底在哪个进程里算。
    本地体系走进程内引擎；其余走 GATEWAY（未配置则自动省略）。
    """
    local = [dict(s, origin="local") for s in LOCAL_SYSTEMS]
    have = {s["id"] for s in local}
    gw = [s for s in _gateway_systems() if s.get("id") and s["id"] not in have]
    return {"systems": local + gw,
            "local": len(local), "gateway": len(gw),
            "total": len(local) + len(gw)}


@app.post("/api/astro/{system}")
def api_astro(system: str, b: BirthInput):
    if not GATEWAY:
        raise HTTPException(status_code=503, detail="未配置 XUANXUE_GATEWAY，进阶体系不可用；本地体系不受影响")
    """通用桥：转给星命网关算（35 个进阶体系）。

    为什么不让前端直连上游网关：网关通常只监听本机或只对内网开放，
    且前端是同源页面；经这里转发才能复用同一个端口/隧道，也便于统一加日志与超时。
    """
    payload = {
        "year": b.year, "month": b.month, "day": b.day, "hour": b.hour,
        "minute": b.minute, "timezone": b.timezone, "latitude": b.latitude,
        "longitude": b.longitude, "location_name": b.location_name,
        # 网关只认 male/female，本地前端用 男/女
        "gender": "male" if b.gender in ("男", "male") else "female",
    }
    req = urllib.request.Request(
        GATEWAY + "/compute/" + urllib.parse.quote(system),
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "ignore")[:300]
        raise HTTPException(status_code=e.code, detail=detail)
    except Exception as e:
        raise HTTPException(status_code=502, detail="星命网关不可用: %s" % str(e)[:200])

@app.post("/api/bazi")
def api_bazi(b: BirthInput):
    return safe(_engine("astro.bazi.calculator:compute_bazi"), b.year, b.month, b.day, b.hour, b.minute,
                gender=b.gender, timezone=b.timezone, latitude=b.latitude,
                longitude=b.longitude, location_name=b.location_name)

@app.post("/api/ziwei")
def api_ziwei(b: BirthInput):
    return safe(_engine("astro.ziwei:compute_ziwei_chart"), b.year, b.month, b.day, b.hour, b.minute,
                b.timezone, b.latitude, b.longitude, b.location_name, b.gender)

@app.post("/api/cetian")
def api_cetian(b: BirthInput):
    return safe(_engine("astro.cetian_ziwei:compute_cetian_ziwei_chart"), b.year, b.month, b.day, b.hour, b.minute,
                b.timezone, b.latitude, b.longitude)

@app.post("/api/liuren")
def api_liuren(b: BirthInput):
    return safe(_engine("astro.sanshi.liuren:compute_liuren_chart"), b.year, b.month, b.day, b.hour, b.minute, b.timezone)

@app.post("/api/qimen")
def api_qimen(b: BirthInput):
    return safe(_engine("astro.sanshi.qimen:compute_qimen_chart"), b.year, b.month, b.day, b.hour, b.minute, 1, b.timezone)

@app.post("/api/huangji")
def api_huangji(b: BirthInput):
    return safe(_engine("astro.huangji:compute_huangji_pan"), b.year, b.month, b.day, b.hour, b.minute,
                b.timezone, b.latitude, b.longitude, b.location_name, None, True, b.gender)

@app.post("/api/qizheng")
def api_qizheng(b: BirthInput):
    return safe(_engine("astro.qizheng.calculator:compute_chart"), b.year, b.month, b.day, b.hour, b.minute,
                b.timezone, b.latitude, b.longitude)

@app.post("/api/liuyao")
def api_liuyao(b: BirthInput):
    return safe(_engine("astro.liuyao_lifetime.calculator:compute_lifetime_hexagram"), b.year, b.month, b.day, b.hour, b.minute, b.gender)

@app.post("/api/beiji")
def api_beiji(b: BirthInput):
    return safe(_engine("astro.beiji.calculator:compute_beiji"), b.year, b.month, b.day, b.hour, b.minute, b.gender)

if __name__ == "__main__":
    import uvicorn
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8899
    print(f"✅ 玄学系统 API 启动: http://localhost:{port} (本地体系 {len(LOCAL_SYSTEMS)} 个)")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
