/**
 * Compiles LESS files into CSS.
 *
 * ---------------------------------------------------------------
 *
 * Only the `assets/styles/importer.less` is compiled.
 * This allows you to control the ordering yourself, i.e. import your
 * dependencies, mixins, variables, resets, etc. before other stylesheets)
 *
 * For usage docs see:
 * 		https://github.com/gruntjs/grunt-contrib-less
 */
module.exports = function(grunt) {

	grunt.config.set('autoprefixer', {
        options: {
            browsers: ['last 2 version', 'ie 8', 'ie 7']
        },
        multiple_files: {
            expand: true,
            flatten: true,
            src: '.tmp/public/styles/*.css',
            dest: '.tmp/public/styles/'
        }
	});

    grunt.loadNpmTasks('grunt-autoprefixer');
};
