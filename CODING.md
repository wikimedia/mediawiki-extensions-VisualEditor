# Contributing to VisualEditor

Thank you for helping us develop VisualEditor!

This file discusses how to report bugs, set up a development environment,
run tests, and build documentation.  It also provides the coding conventions
we use in the project.

## Bug reports

Please report bugs using the
[Wikimedia Foundation's bugzilla instance](https://bugzilla.wikimedia.org/enter_bug.cgi?product=VisualEditor&component=General).
Feel free to use the `General` component if you don't know where else
your bug might belong.  Don't worry about specifying version,
severity, hardware, or OS.

## Running tests

VisualEditor uses the [Grunt](http://gruntjs.com/) task runner.
To install it (and other needed packages),
[install node and npm](http://nodejs.org/download/) and run:

```sh
$ npm install -g grunt-cli
$ npm install
```

To run the tests, use:
```sh
$ grunt test
```

For other grunt tasks, see:
```sh
$ grunt --help
```

You can also run a subset of the tests in your web browser.  Set:
```php
$wgEnableJavaScriptTest = true;
```
in your mediawiki install's `LocalSettings.php` file, then visit
`http://URL_OF_YOUR_MEDIAWIKI_INSTALL/index.php/Special:JavaScriptTest/qunit`
(for example, http://127.0.01/mediawiki/index.php/Special:JavaScriptTest/qunit).

## Building documentation

VisualEditor uses [JSDuck](https://github.com/senchalabs/jsduck) to
process documentation comments embedded in the code.  To build the
documentation, you will need `ruby`, `gem`, and `jsduck` installed.

### Installing ruby and gem

You're mostly on your own here, but we can give some hints for Mac OS X.

##### Installing Gem in Mac OS X
Ruby ships with OSX but may be outdated. Use [Homebrew](http://mxcl.github.com/homebrew/):
```sh
$ brew install ruby
```

If you've never used `gem` before, don't forget to add the gem's bin to your `PATH` ([howto](http://stackoverflow.com/a/14138490/319266)).

### Installing jsduck

Once you have gem, installing [JSDuck](https://github.com/senchalabs/jsduck) is easy:
```sh
$ gem install --user-install jsduck
```

### Running jsduck

Creating the documentation is easy:
```sh
$ cd VisualEditor
$ .docs/generate.sh
```

You may need to set `MW_INSTALL_PATH` in your environment to the
location of your mediawiki installation if VisualEditor is not
checked out directly in the mediawiki extensions folder (for example,
if you're using a symlink).

The generated documentation is in the `docs/` subdirectory.  View the
documentation at
`http://URL_OF_YOUR_MEDIAWIKI_INSTALL/extensions/VisualEditor/docs/`
(for example, http://127.0.0.1/mediawiki/extensions/VisualEditor/docs).
Note that `jsduck` doesn't support browsing vis the `file:` protocol.

## VisualEditor Code Guidelines

We inherit the code structure (about whitespace, naming and comments) conventions
from MediaWiki. See [Manual:Coding conventions/JavaScript](https://www.mediawiki.org/wiki/Manual:Coding_conventions/JavaScript) on mediawiki.org.

### Documentation comments

* End sentences in a full stop.
* Continue sentences belonging to an annotation on the next line, indented with an
  additional space.
* Types in documentation comments should be separated by a pipe character. Use types
  that are listed in the Types section of this document, otherwise use the identifier
  (full path from the global scope) of the constructor function (e.g. `{ve.dm.BranchNode}`).

### Annotations

We use the following annotations. They should be used in the order as they are described
here, for consistency. See [JSDuck/Tags](https://github.com/senchalabs/jsduck/wiki/Tags) for more elaborate documentation.

* @class Name (optional, guessed)
* @abstract
* @extends ClassName
* @mixins ClassName
* @constructor
* @private
* @static
* @method name (optional, guessed)
* @template
* @property name (optional, guessed)
* @until Text: Optional text.
* @source Text
* @context {Type} Optional text.
* @param {Type} name Optional text.
* @emits name
* @returns {Type} Optional text.
* @chainable
* @throws {Type}

### Types

Special values:
* undefined
* null
* this

Primitive types:
* boolean
* number
* string

Built-in classes:
* Array
* Date
* Function
* RegExp
* Object

Browser classes:
* HTMLElement

jQuery classes:
* jQuery
* jQuery.Event

## Add a new javascript class

When a new javascript class is added, the file must be referenced in a number of places
before it can be used.

Test files:
* VisualEditor.hooks.php in onResourceLoaderTestModules

Regular files:
* .docs/categories.json in General->Utilities (or somewhere more specific)
* VisualEditor.php in ext.visualEditor.core (or somewhere more specific)
* Run `php maintenance/makeStaticLoader.php --target demo --write-file demos/ve/index.php`
* Run `php maintenance/makeStaticLoader.php --target test --write-file modules/ve/test/index.php`

makeStaticLoader.php is a maintenance script to automatically generate an HTML document fragment
containing script tags in dependency order (for standalone environments without ResourceLoader).
