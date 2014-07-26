module.exports = function(grunt) {

    var fs = require('fs');
    require('rootpath')();

    grunt.initConfig({
        jsonStore: {
            path: 'test/data/data.json',
            clean: true
        }
    });

    grunt.registerTask('jsonStore', 'Clean jsonStore data file.', function() {

        var jsonStore = grunt.config('jsonStore.path');
        var clean = grunt.config('jsonStore.clean');

        if (clean) {
            fs.writeFileSync(jsonStore, '{}', 'utf8');

        }

        grunt.log.writeln('Currently running the "jsonStore" clean task.');
    });

};