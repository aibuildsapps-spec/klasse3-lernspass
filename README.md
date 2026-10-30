# Lernspaß – Anleitung für Eltern

## 1. Online stellen (einmalig, ca. 3 Minuten)
1. Öffne https://app.netlify.com/drop (kostenloses Konto nötig).
2. Ziehe den **ganzen Ordner `lernspass`** auf die Seite.
3. Du bekommst einen Link wie `https://irgendwas.netlify.app` (unter *Site configuration → Change site name* kannst du ihn schöner machen).
4. Schicke den Link an die iPads (AirDrop / iMessage / E-Mail).

## 2. Auf dem iPad installieren (einmalig, mit Internet)
1. Link in **Safari** öffnen.
2. Teilen-Symbol → **„Zum Home-Bildschirm“** → Hinzufügen.
3. App einmal vom Home-Bildschirm öffnen. Ab jetzt funktioniert sie **ohne Internet**.

## 3. Update schicken
1. Dateien ändern (z. B. neue Aufgaben in `gen.js`, Prüfungsdatum oben in `app.js` bei `EXAM`).
2. In `version.js` die Nummer erhöhen (z. B. `1.0.0` → `1.0.1`).
3. Bei Netlify: Site → **Deploys** → den Ordner `lernspass` erneut hineinziehen. **Der Link bleibt gleich.**
4. Sobald das iPad Internet hat und die App geöffnet wird, lädt sie das Update im Hintergrund und zeigt „Neue Version ist da – tippe zum Neuladen“. Sterne und Ergebnisse bleiben erhalten.

## Daten
* Alles (Name, Sterne, Ergebnisse) liegt nur auf dem jeweiligen iPad.
* Eltern-Bereich (⚙️, mit Rechenfrage geschützt): CSV-Tabelle oder JSON-Sicherung herunterladen, Sicherung wieder einlesen, Profil löschen (erst nach Download möglich).
* Tipp: Gelegentlich eine Sicherung machen, und die App immer über das Home-Bildschirm-Symbol öffnen (nicht über Safari-Tabs).
