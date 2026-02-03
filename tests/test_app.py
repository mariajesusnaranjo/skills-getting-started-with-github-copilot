import copy
from fastapi.testclient import TestClient
import src.app as app_module

client = TestClient(app_module.app)


# Reset shared in-memory activities before/after each test
import pytest

@pytest.fixture(autouse=True)
def reset_activities():
    original = copy.deepcopy(app_module.activities)
    yield
    app_module.activities.clear()
    app_module.activities.update(original)


def test_get_activities():
    r = client.get("/activities")
    assert r.status_code == 200
    data = r.json()
    assert "Chess Club" in data
    assert isinstance(data["Chess Club"]["participants"], list)


def test_signup_success_and_reflects():
    email = "test_student@mergington.edu"
    # signup
    r = client.post(f"/activities/Chess%20Club/signup?email={email}")
    assert r.status_code == 200
    assert f"Signed up {email} for Chess Club" in r.json().get("message", "")

    # check it appears in GET
    r2 = client.get("/activities")
    assert email in r2.json()["Chess Club"]["participants"]


def test_signup_duplicate_returns_400():
    # michael@mergington.edu is initially signed up for Chess Club
    r = client.post("/activities/Chess%20Club/signup?email=michael@mergington.edu")
    assert r.status_code == 400
    assert "already signed up" in r.json().get("detail", "")


def test_delete_participant_success():
    email = "michael@mergington.edu"
    # Ensure it's present first
    r = client.get("/activities")
    assert email in r.json()["Chess Club"]["participants"]

    # Delete
    r2 = client.delete(f"/activities/Chess%20Club/participants?email={email}")
    assert r2.status_code == 200
    assert f"Unregistered {email} from Chess Club" in r2.json().get("message", "")

    # Verify removal
    r3 = client.get("/activities")
    assert email not in r3.json()["Chess Club"]["participants"]


def test_delete_nonexistent_participant_returns_404():
    r = client.delete("/activities/Chess%20Club/participants?email=not_found@x.com")
    assert r.status_code == 404
    assert "Student not signed up" in r.json().get("detail", "")
