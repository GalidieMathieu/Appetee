# Incident Evidence Assets

This folder is optional.

Use it only when the incident has useful supporting evidence.

Examples:

```text
screenshot-01.png
screenshot-02.png
network-response.json
sanitized-log.txt
query-plan.txt
```

Reference assets from the incident `README.md` using relative links.

Example:

```md
![Login failure](./assets/screenshot-01.png)
```

Do not store passwords, cookies, authentication tokens, connection strings, API secrets, private keys, or unnecessary personal data.

Delete this `assets/` folder entirely when the incident does not need supporting files.
