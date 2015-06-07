
[![Build Status](https://travis-ci.org/guy-mograbi-at-gigaspaces/gs-ui-infra.png)](https://travis-ci.org/guy-mograbi-at-gigaspaces/gs-ui-infra.png)


# To set up projects like this one do the following:


1. Install ruby (I used 1.8)
1. gem install compass
1. install node
1. `npm -g install yo` (this installs grunt and bower as well).
1. `npm -g install generator-express-angular`
1. Create an empty project in github
1. cd to that project
1. run `yo express-angular`


# tweaks made to the "express-angular" template

1. I modified some "src" tags from "component/..." to "bower_component/..." - seems like a minor bug.


# Working with this project


1. `grunt server` - runs the server with "watch" capabilities (it reloads when you change the scss files).
1. IDEs should ignore the following folders
 1. dist
 1. .tmp
 1. .sass-cache
 1. node_modules

## Adding new angular items

To add new angular items such as "directive" or "controller" etc..
You need to use yeoman generators.
Since we used "https://npmjs.org/package/generator-express-angular" to generate this project
you can freely use all supported generators for angular.

For example - a new directive should be made with
`yo angular:directive myDirectiveName`

This will create the directive file and a test file.


# Remote debug

Thanks to stackoverflow's answer
http://stackoverflow.com/a/13443026/1068746

You can easily remote debug node with the flag `--debug-brk`.

Since Grunt is usually executed directly `grunt args` - to debug it you need to do
`node --debug-brk /full/path/to/grunt myTask`

# How should this be used?

This does not go through a build process. When you add js-ui-infra in your project as bower dependency, it downloads the entire thing. 
That way, you can include only the resources you require.
