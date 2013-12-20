/*!
 * VisualEditor CommandRegistry class.
 *
 * @copyright 2011-2014 VisualEditor Team and others; see AUTHORS.txt
 * @license The MIT License (MIT); see LICENSE.txt
 */

/* MW Command Registrations */

ve.ui.commandRegistry.register(
	new ve.ui.Command( 'gallery', 'inspector', 'open', 'gallery' )
);
ve.ui.commandRegistry.register(
	new ve.ui.Command( 'math', 'inspector', 'open', 'math' )
);
ve.ui.commandRegistry.register(
	new ve.ui.Command( 'mediaEdit', 'dialog', 'open', 'mediaEdit' )
);
ve.ui.commandRegistry.register(
	new ve.ui.Command( 'referenceList', 'dialog', 'open', 'referenceList' )
);
ve.ui.commandRegistry.register(
	new ve.ui.Command( 'reference', 'dialog', 'open', 'reference' )
);
ve.ui.commandRegistry.register(
	new ve.ui.Command( 'transclusion', 'dialog', 'open', 'transclusion' )
);
ve.ui.commandRegistry.register(
	new ve.ui.Command( 'alienExtension', 'inspector', 'open', 'alienExtension' )
);
