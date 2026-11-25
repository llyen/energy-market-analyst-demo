# Analityk Rynku

Niewielkie demo analityki rynku energii, zbudowane jako aplikacja Microsoft Fabric na Rayfin. Ceny w aplikacji są syntetyczne.

Wersja angielska: [README.md](README.md).

## Co robi aplikacja

Po zalogowaniu są cztery zakładki. Dashboard pokazuje liczby zbiorcze i instrumenty o największej zmianie ceny. W zakładce Ceny rynkowe jest lista instrumentów z ostatnią ceną, historia notowań, formularz dodania notowania i formularz dodania nowego instrumentu. Alerty to progi cenowe (powyżej lub poniżej wartości) dla instrumentu. Alert jest wyróżniony w interfejsie, gdy ostatnia cena przekroczy próg, ale aplikacja nie wysyła żadnych powiadomień. Notatki to zapiski analityka z oznaczeniem sentymentu, opcjonalnie przypięte do instrumentu.

Przycisk generowania danych tworzy sześć przykładowych instrumentów (uprawnienia EU ETS, gaz TTF, energia baseload w Niemczech i w Polsce, węgiel API2, ropa Brent) i losowy przebieg cen z 22 dni, opisany jako „Demo feed”. To nie są prawdziwe notowania. Alerty i notatki są zapisywane osobno dla każdego użytkownika.

## Stos

React 19, Vite 7, Tailwind CSS 4 i TypeScript. Backend to Rayfin (pakiety `@microsoft/rayfin-*`) z usługami auth, data (dialekt MSSQL) i hostingiem statycznym na Microsoft Fabric. Model danych leży w `rayfin/data/`.

## Uruchomienie lokalne

Potrzebny jest Node.js 20+ i Docker Desktop.

```bash
npm ci
npm run rayfin:db
npm run dev:local      # http://localhost:5173
```

Przy adresie API na localhost aplikacja loguje e-mailem i hasłem.

## Wdrożenie na Microsoft Fabric

```bash
npx rayfin login -t <TENANT_ID>
npm run up
```

Poza localhost aplikacja loguje przez Fabric (Entra ID). Po pierwszym wdrożeniu adres aplikacji powinien trafić do `allowedRedirectUris` w `rayfin/rayfin.yml`, jeśli CLI nie dopisało go samo.

Pliki `AGENTS.md`, `.agents/` i `.mcp.json` to standardowy kontekst Rayfin dla agentów kodujących.

## Zastrzeżenie

To demo. Ceny są losowe i nie nadają się do żadnych decyzji handlowych ani inwestycyjnych. Projekt nie jest oficjalnym produktem Microsoft.

## Licencja

MIT, szczegóły w [LICENSE](LICENSE).
