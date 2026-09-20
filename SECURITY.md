# Security notes

ProxyPulse v1 performs TCP reachability/latency pre-checks only. It does not claim that a proxy tunnel is authenticated, private, trustworthy, or safe to send sensitive traffic through.

The static config checks only inspect URI parameters for obvious configuration hygiene issues (for example disabled TLS verification or incomplete Reality parameters). They are not a cryptographic or server security audit.

Do not commit private subscriptions, credentials, tokens or private proxy URIs to a public repository.
