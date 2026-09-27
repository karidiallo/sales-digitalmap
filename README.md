# DigitalMap Sales OS — FINAL DEPLOY

Supabase jest już podłączony.
CNAME jest ustawiony na:

sales.digitalmap.pl

## Co wrzucić na GitHuba
Wrzuć CAŁĄ zawartość tego folderu do repo, tak aby w root repo były:

- index.html
- CNAME
- supabase.sql
- README.md
- css/
- js/

Nie wrzucaj folderu nadrzędnego jako jednego podfolderu.

## Jeśli repo już istnieje

W terminalu, będąc w folderze repo:

git pull
git add .
git commit -m "feat: deploy persistent DigitalMap Sales OS"
git push

Jeśli podmieniasz stare pliki aplikacji, po prostu nadpisz je tymi z paczki.

## GitHub Pages

Repo -> Settings -> Pages

Powinno być:

Source:
Deploy from a branch

Branch:
main

Folder:
/

Custom domain:
sales.digitalmap.pl

Enforce HTTPS:
ON

## Supabase Auth

Ponieważ używasz logowania email + password i użytkownika dodajesz ręcznie:
Supabase -> Authentication -> Users

Upewnij się, że masz utworzone swoje konto użytkownika.

## Test po deployu

1. Otwórz:
https://sales.digitalmap.pl

2. Zaloguj się.

3. Dodaj testowego leada:
Firma: TEST
Branża: Inne
Next action: Test follow-up
Follow-up date: dzisiaj

4. Odśwież stronę.

Lead powinien dalej istnieć.

5. Kliknij Done przy follow-upie.

6. Odśwież stronę ponownie.

Follow-up powinien zniknąć, a XP powinno wzrosnąć.

## Ważne

W frontendzie znajduje się tylko Supabase publishable key.
Nie dodawaj nigdy service_role ani secret key.

Dane są ograniczone przez RLS do zalogowanego użytkownika.
