collab = {};
collab.settings = {
	host: 'http://localhost',
	port: 8000,
};	

if( typeof module == 'object' ) {
	module.exports.settings = collab.settings;
}
