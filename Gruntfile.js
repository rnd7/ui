module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    meta: {
      banner: '// UI v<%= pkg.version %>\n' +
        '// https://github.com/rnd7/ui\n' +
        '// <%= grunt.template.today("yyyy-mm-dd") %>, rnd7, MIT License\n'
    },
    uglify: {
      options: {
         mangle: true,
         sourceMap: true,
         banner: '<%= meta.banner %>'
      },
      ui: {
        files: {
          'bin/ui.min.js': ['lib/keyboard.js', 'lib/gui.js']
        }
      },
      keyboard: {
        files: {
          'bin/keyboard.min.js': ['lib/keyboard.js']
        }
      },
      gui: {
        files: {
          'bin/gui.min.js': ['lib/gui.js']
        }
      }
    },
    jsdoc: {
      dist: {
        src: ['README.md','lib/*.js'],
        jsdoc: './node_modules/.bin/jsdoc',
        options: {
          destination: 'doc',
          configure: './jsdoc-config.json',
          template: './node_modules/ink-docstrap/template'
        }
      }
   }
  });

  grunt.loadNpmTasks('grunt-jsdoc');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.registerTask('default', ['jsdoc', 'uglify']);
};
