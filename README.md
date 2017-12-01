# AWS CloudFormation Stack Validator

WIP

```bash
npm install -g stackvalidator
```

validates all templates recursively from current working directory

```bash
stackvalidator
```

`--path` defines path to the files you want to validate

`--delay` increases delay between validations, use if the rate exceeds

```bash
stackvalidator --path=path-to-files --delay=500
```
