# Personal website

[![Netlify Status](https://api.netlify.com/api/v1/badges/4698db8e-0a54-4ce7-a6a1-ac0d997ee94b/deploy-status)](https://app.netlify.com/sites/sad-kilby-2df4e2/deploys)

The gatsby project for my personal website

## Development

This project is currently using Node 18.12.1. I personally have used [nvm](https://github.com/nvm-sh/nvm) to manage node versions, but this is optional. The project may work on newer versions of Node I have not personally tried them.

if you are using NVM:
```bash
nvm install 18.12.1
```

```bash
npm install --include=dev
```
There were a few warnings/errors that popped up when doing this, it seems like they are not deal breakers. Hopefully one day, I will update all the dependencies!

```bash
npm run develop
```

This will compile and setup the website with hot reloading. navigate to http://localhost:8888/

If you are working on the snallabot dashboard,

```bash
npm run functions
```

This will start the function connectors needed for the dashboard to work. Navigate to http://localhost:8888/snallabot/?league=1198780271814770829 to see a working dashboard. 

NOTE: port may change, but both the commands should work together in tandem. 