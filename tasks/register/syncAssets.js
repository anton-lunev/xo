module.exports = function (grunt) {
	grunt.registerTask('syncAssets', [
		'jst:dev',
		'less:dev',
        'autoprefixer:multiple_files',
		'sync:dev',
		'coffee:dev'
	]);
};
