CALL git add . -A
CALL git commit -m %1
CALL npm version minor -m %1
CALL npm publish
CALL git push
CALL git push --tags