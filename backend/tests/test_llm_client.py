import httpx
import pytest
import respx

import app.llm.client as client_mod
from app.llm.client import OpenAICompatibleClient

URL = "https://llm.test/v1/chat/completions"


def _ok(text="hello"):
    return httpx.Response(200, json={"choices": [{"message": {"content": text}}]})


@pytest.fixture(autouse=True)
def _no_sleep(monkeypatch):
    # Make backoff instant so tests are fast.
    monkeypatch.setattr(client_mod.time, "sleep", lambda *_: None)


@respx.mock
def test_retries_then_succeeds_on_rate_limit():
    respx.post(URL).mock(side_effect=[httpx.Response(429), httpx.Response(403), _ok("done")])
    client = OpenAICompatibleClient("https://llm.test/v1", "k", "m", max_retries=5)
    assert client.complete("sys", "user") == "done"
    assert respx.calls.call_count == 3


@respx.mock
def test_gives_up_after_max_retries():
    respx.post(URL).mock(return_value=httpx.Response(429))
    client = OpenAICompatibleClient("https://llm.test/v1", "k", "m", max_retries=3)
    with pytest.raises(httpx.HTTPStatusError):
        client.complete("sys", "user")
    assert respx.calls.call_count == 3


@respx.mock
def test_does_not_retry_on_400():
    respx.post(URL).mock(return_value=httpx.Response(400))
    client = OpenAICompatibleClient("https://llm.test/v1", "k", "m", max_retries=5)
    with pytest.raises(httpx.HTTPStatusError):
        client.complete("sys", "user")
    assert respx.calls.call_count == 1  # 400 is not retryable
