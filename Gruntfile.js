"use strict";


module.exports = function( grunt ){

    // load all grunt tasks
    require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

    grunt.initConfig({
        yeoman:{
            "dist":"dist",
            "app":"app"
        },
        clean: {
            dist: {
                files: [
                    {
                        dot: true,
                        src: [
                            '.tmp',
                            '<%= yeoman.dist %>/*',
                            '!<%= yeoman.dist %>/.git*'
                        ]
                    }
                ]
            },
            server: '.tmp'
        },
        uglify: {
            config1 : {
                files: {
                    "gs-ui-infra.min.js":['assets/javascripts/*.js']
                }
            }
        }
    });


    grunt.registerTask('build', [
        'clean:dist' ,
//        'jshint',
//        'test',
//        'coffee',
//        'compass:dist',
//        'useminPrepare',
//        'concat',
//        'imagemin',
//        'cssmin',
//        'htmlmin',
//        'copy',
//        'cdnify',
//        'ngmin',
        'uglify:config1',
//        'rev',
//        'usemin'
    ]);

    grunt.registerTask('default', ['build']);

};