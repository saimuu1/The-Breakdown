from app.sports.base import SportAdapter, all_adapters, clear_registry, get_adapter, register

from .fakes import FakeAdapter


def test_register_and_lookup():
    clear_registry()
    adapter = FakeAdapter()
    register(adapter)
    assert get_adapter("fake") is adapter
    assert adapter in all_adapters()
    clear_registry()
    assert all_adapters() == []


def test_fake_adapter_satisfies_protocol():
    # runtime_checkable Protocol — the contract is structural, not inheritance-based.
    assert isinstance(FakeAdapter(), SportAdapter)
