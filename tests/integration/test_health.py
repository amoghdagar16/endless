from __future__ import annotations

from fastapi.testclient import TestClient

from app.api.v1.deps import get_db
from app.main import app


class _FakeSession:
    def execute(self, *_args, **_kwargs):
        return [[1]]

    def close(self):
        pass


def test_health_endpoint():
    app.dependency_overrides[get_db] = lambda: _FakeSession()
    client = TestClient(app)

    response = client.get("/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "db": "ok"}

    app.dependency_overrides.clear()
