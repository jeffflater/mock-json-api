module.exports = function(grunt) {

    var fs = require('fs');
    var exec = require('child_process').exec;
    require('rootpath')();

    grunt.loadNpmTasks('grunt-contrib-jshint');

    grunt.initConfig({
        jsonStore: {
            path: 'test/data/data.json',
            clean: true
        },
        jshint: {
            options: {
                reporter: require('jshint-stylish'),
                reporterOutput: ""
            },
            all: ['mock.js', 'test/specs/*.spec.js']
        },
        test: {
            specs: 'test/specs/'
        }
    });

    grunt.registerTask('jsonStore:clean', 'Clean jsonStore data file.', function() {
        var jsonStore = grunt.config('jsonStore.path');
        var clean = grunt.config('jsonStore.clean');

        if (clean) {
            fs.writeFileSync(jsonStore, '{}', 'utf8');
        }

        grunt.log.writeln('Currently running the "jsonStore:clean" task.');
    });

    grunt.registerTask('mockTest', 'Test Mock JSON API.', function() {
        var done = this.async();
        var specs = grunt.config('test.specs');

        exec("jasmine-node-karma "+specs+" --verbose", function(error, stdout, stderr){
            if (error){
                grunt.log.writeln(error);
            }
            if (stderr) {
                grunt.log.writeln(stderr);
            }
            grunt.log.writeln(stdout);
            done(true);
        });

        grunt.log.writeln('Currently running the "mockJsonApi:test" task.');
    });

    grunt.registerTask('default', 'Test mock-json-api project.', function() {
        grunt.task.run(['jshint', 'jsonStore:clean', 'mockTest']);
        grunt.log.writeln('Currently running the "default" task.');
    });

};