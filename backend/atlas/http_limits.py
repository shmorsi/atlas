"""Bound request memory before JSON parsing; no uploaded data is persisted."""

from typing import Any

from starlette.responses import JSONResponse


class RequestLimits:
    """Reject cross-origin and oversized mutations before the body is parsed."""

    def __init__(self, app: Any, max_bytes: int = 4_000_000) -> None:
        """Store the downstream app and the byte cap."""
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Any, receive: Any, send: Any) -> Any:
        """Enforce the local-origin and 4 MB limits, then pass the body once."""
        if scope["type"] != "http" or scope["method"] not in ("POST", "PUT", "PATCH"):
            return await self.app(scope, receive, send)
        headers = dict(scope.get("headers", []))
        origin = headers.get(b"origin", b"").decode()
        host = headers.get(b"host", b"").decode()
        if origin and origin not in {
            f"http://{host}",
            "http://127.0.0.1:5173",
            "http://localhost:5173",
        }:
            return await JSONResponse(
                {"detail": "Cross-origin mutation denied"}, status_code=403
            )(scope, receive, send)
        chunks = []
        size = 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            body = message.get("body", b"")
            size += len(body)
            if size > self.max_bytes:
                return await JSONResponse(
                    {"detail": "Request exceeds 4 MB limit"}, status_code=413
                )(scope, receive, send)
            chunks.append(body)
            if not message.get("more_body", False):
                break
        delivered = False

        async def bounded_receive():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {
                    "type": "http.request",
                    "body": b"".join(chunks),
                    "more_body": False,
                }
            return await receive()

        await self.app(scope, bounded_receive, send)
