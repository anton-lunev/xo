module.exports = function (grunt) {
	grunt.registerTask('compileAssets', [
		'jst:dev',
		'less:dev',
        'autoprefixer:multiple_files',
		'copy:dev',
		'coffee:dev'
	]);
};
