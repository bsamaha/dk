from typing import Any, Callable, TypeVar

from starlette.concurrency import run_in_threadpool

T = TypeVar("T")


async def run_service(func: Callable[..., T], *args: Any, **kwargs: Any) -> T:
    """Run a blocking service function in the threadpool.

    This provides a small convenience wrapper around run_in_threadpool so
    routers don't need to import starlette.concurrency directly.
    """
    return await run_in_threadpool(func, *args, **kwargs)
