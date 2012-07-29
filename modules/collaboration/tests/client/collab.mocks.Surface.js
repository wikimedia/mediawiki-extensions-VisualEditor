collab.mocks.Surface = function( html ) {
	var data = ve.dm.converter.getDataFromDom( $( html )[0] );
	var dm = this.dm = new ve.dm.Document( data );
	this.surfaceModel = new ve.dm.Surface( dm );
}

collab.mocks.Surface.prototype.getModel = function() {
	return this.surfaceModel;
};

collab.mocks.Surface.prototype.getDocumentModel = function () {
	return this.dm;
};
