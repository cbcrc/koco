CALL npm install
CALL npm run build
CALL git add . -A
CALL git commit -m %2
CALL npm version %1 -m %2
CALL npm publish
CALL git push
CALL git push --tags