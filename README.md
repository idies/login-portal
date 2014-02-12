login-portal
============

The portal for DIBBs Single Sign On

Installation
------------

Install http://nodejs.org

Install bower & grunt
```bash
$ npm install bower -g
$ npm install grunt-cli
```

To launch portal in dev mode:

```bash
$ git clone https://github.com/idies/login-portal.git
$ cd login-portal
$ npm install && bower install && grunt

# Open browser on http://localhost:8080
```

(version of angular and angular-animate should be equal)

Grunt compiles the portal into build folder, which can be relocated to any web server for production use ('grunt build').
