# Security notes

ProxyPulse v1.1 uses two validation levels:

- bounded TCP reachability/latency pre-checks for the selected scan pool;
- bounded end-to-end tunnel validation for up to `egress_test_limit` reachable candidates using sing-box and an outbound request to the configured trace endpoint.

A successful end-to-end check proves that the tested configuration was able to carry that specific request at that point in time and exposes the observed final egress IP/country. It does **not** prove that the proxy is private, trustworthy, uncompromised, suitable for sensitive traffic, or reliable for every destination/protocol.

The static config checks only inspect URI parameters for obvious configuration hygiene issues (for example disabled TLS verification or incomplete Reality parameters). They are not a cryptographic or server security audit.

End-to-end validation creates real outbound connections through tested proxies. Keep `egress_test_limit`, concurrency and schedule frequency bounded, and use only sources/infrastructure you are authorized to test.

Do not commit private subscriptions, credentials, tokens or private proxy URIs to a public repository.
