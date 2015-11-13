var mios = {

    icons: false,

    getIcons: function() {

        return this.icons;

    },

    sizes: false,

    getSizes: function( type ) {

        return this.sizes[type];

    },

    mergeSizes: function( iconObj ) {

        var sizes = [];

        if ( iconObj.icons.appicon ) sizes.push( this.getSizes('appicon') );
        if ( iconObj.icons.icon ) sizes.push( this.getSizes('icon') );
        if ( iconObj.icons.custom ) sizes.push( iconObj.icons.custom );

        if ( iconObj.icons.iconbundle ) {

            var iconbundleSizes = this.getSizes('iconbundle');
            
            for ( var b = 0; b < iconbundleSizes.length; b++ ) {
                sizes.push([
                    [ iconObj.bundle_id + iconbundleSizes[b][0], iconbundleSizes[b][1], false, 'iconbundle' ]
                ]);
            }

        }

        return sizes;

    },

    sortSizes: function( sizes ) {

        var sizesObj = [];

        for ( var i = 0; i < sizes.length; i++ ) {

            for ( var j = 0; j < sizes[i].length; j++ ) {
                sizesObj.push( sizes[i][j] );
            }

        }

        sizesObj.sort(function(a, b) {
            return b[1] - a[1];
        });

        return sizesObj;

    },

    docValidate: function( doc, name ) {

        var appWidth = doc.width,
            appHeight = doc.height;


        if ( appWidth !== appHeight ) {
            if ( !this.errors ) this.errors = [];
            this.errors.push( name + ' - not square\r');
            return false;
        }

        if ( appWidth < 512 ) {
            if ( !this.errors ) this.errors = [];
            this.errors.push( name + ' - smaller than 512px\r');
            return false;
        }

        return true;

    },

    compress: function( file ) {

        if ( activeDocument.mode == DocumentMode.INDEXEDCOLOR ) {
            activeDocument.changeMode( ChangeMode.RGB );
        }

        var tinypng = new ActionDescriptor();
        tinypng.putPath(charIDToTypeID("In  "), file);

        var compress = new ActionDescriptor();
        compress.putObject(charIDToTypeID("Usng"), charIDToTypeID("tinY"), tinypng);
        executeAction(charIDToTypeID("Expr"), compress, DialogModes.NO);

    },

    save: function( file, compress ) {

        if ( !compress ) {

            var opts = new PNGSaveOptions();
            opts.interlaced = true;

            activeDocument.saveAs( file, opts );

        } else {

            var tinypng,
                compressImage;

            if ( activeDocument.mode == DocumentMode.INDEXEDCOLOR ) {
                activeDocument.changeMode( ChangeMode.RGB );
            }

            tinypng = new ActionDescriptor();
            tinypng.putPath(charIDToTypeID("In  "), file);

            compressImage = new ActionDescriptor();
            compressImage.putObject(charIDToTypeID("Usng"), charIDToTypeID("tinY"), tinypng);

            executeAction(charIDToTypeID("Expr"), compressImage, DialogModes.NO);

        }


    },

    build: function( args ) {

        var dirIcons = new Folder( (new File($.fileName)).parent + "/assets/icons/" ),
            iconList = this.getIcons();

        for ( var i = 0, iconsLen = iconList.length; i < iconsLen; i++ ) {

            var iconObj = iconList[i],
                iconDir,
                iconDoc,
                bundleFolder,
                iconBundleFolder,
                iconFolder;

            if ( !iconObj.psd_id ) continue;

            if ( iconDir = dirIcons.getFiles(iconObj.psd_id + '.psd')[0] ) {
                
                iconDoc = open( iconDir );
                
                if ( args.length > 0 && args[0] === 'test' ) {
                
                    if ( args.length > 1 && args[1] === 'save' ) {
                        iconDoc.close( SaveOptions.SAVECHANGES );
                    } else {
                        iconDoc.close( SaveOptions.DONOTSAVECHANGES );
                    }

                    continue;
                
                }

                iconDoc.flatten();

            } else {
                
                if ( !this.errors ) this.errors = [];
                this.errors.push( iconObj.name + ' - PSD does not exist\r');
                continue;

            }

            if ( !this.docValidate( iconDoc, iconObj.name ) ) {
                iconDoc.close( SaveOptions.DONOTSAVECHANGES );
                continue;
            }

            if ( iconObj.icons ) {

                iconFolder = iconObj.icons.folder && iconObj.icons.folder !== '' ? iconObj.icons.folder : false;
                
                bundleFolder = new Folder( (new File($.fileName)).parent + "/dist/mios/Bundles/" + iconObj.bundle_id + ( iconFolder ? iconFolder : '' ) );
                if ( !bundleFolder.exists ) bundleFolder.create();
                
                if ( iconObj.icons.iconbundle ) {
                    iconBundleFolder = new Folder( (new File($.fileName)).parent + "/dist/mios/IconBundles" + ( iconFolder === 'alt' || iconFolder === '/alt' ? '/alt' : '' ) );
                    if ( !iconBundleFolder.exists ) iconBundleFolder.create();
                }

                iconSizes = this.sortSizes( this.mergeSizes( iconObj ) );

            }

            if ( !iconSizes.length ) {
                iconDoc.close( SaveOptions.DONOTSAVECHANGES );
                continue;
            }

            if ( iconObj.mask ) {

                iconDoc.artLayers.getByName('Background').isBackgroundLayer = false;

                var maskPoints = this.getMaskPoints(),
                    maskShape = this.drawMask( maskPoints );

                this.clearMask( maskShape );

            }

            for ( var j = 0, iconSizesLen = iconSizes.length; j < iconSizesLen; j++ ) {

                var iconFile,
                    iconFilePath = '/';

                iconFilePath += "/" + iconSizes[j][0] + ( iconSizes[j][2] && iconSizes[j][2] !== '' ? '' : ".png" );
                app.activeDocument.resizeImage( iconSizes[j][1], iconSizes[j][1], undefined, ResampleMethod.BICUBICSHARPER);
                
                if ( iconSizes[j][3] === 'iconbundle' ) {
                    iconFile = new File( decodeURI(iconBundleFolder) + iconFilePath );
                } else {
                    iconFile = new File( decodeURI(bundleFolder) + iconFilePath );
                }

                if ( ( args.length > 0 && args[0] === 'compressed' ) ) {
                    this.save( iconFile, true );
                } else {
                    this.save( iconFile, false );
                }

                app.activeDocument.activeHistoryState = app.activeDocument.historyStates[app.activeDocument.historyStates.length - 2];

            }

            iconDoc.close( SaveOptions.DONOTSAVECHANGES );

        }

    },

    getMaskPoints: function() {

        var width = parseInt( app.activeDocument.width, 10 ),
            height = parseInt( app.activeDocument.height, 10 ),
            middle = width / 2,
            points = [];

        points[0] = [
            [ middle, 0 ],
            [ width * 0.91796875, 0 ],
            [ width * 0.08203125, 0 ]
        ];

        points[1] = [
            [ width, middle ],
            [ width, height * 0.91796875 ],
            [ width, height * 0.08203125 ]
        ];

        points[2] = [
            [ middle, height ],
            [ width * 0.08203125, height ],
            [ width * 0.91796875, height ]
        ];

        points[3] = [
            [ 0, middle ],
            [ 0, height * 0.08203125 ],
            [ 0, height * 0.91796875 ]
        ];

        return points;

    },

    drawMask: function( points ) {

        var doc = app.activeDocument,
            lineArray = [],
            pathItem,
            makePathPoint,
            drawShape;

        makePathPoint = function( xy ) {
            var pathPoint = new PathPointInfo;
            pathPoint.kind = PointKind.CORNERPOINT;
            pathPoint.anchor = xy[0];
            pathPoint.leftDirection = xy[1];
            pathPoint.rightDirection = xy[2];
            return pathPoint;
        };

        makeSubPath = function( points ) {
            var subPath = new SubPathInfo();
            subPath.closed = true;
            subPath.operation = ShapeOperation.SHAPEADD;
            subPath.entireSubPath = points;
            return subPath;
        };

        for ( var i = 0, pointsLen = points.length; i < pointsLen; i++ ) {
            lineArray.push( makePathPoint( points[i] ) );
        }

        pathItem = doc.pathItems.add("myPath", [ makeSubPath( lineArray ) ]);

        return pathItem;

    },

    clearMask: function( mask ) {

        var selection;

        mask.makeSelection();
        mask.remove();

        selection = app.activeDocument.selection;
        selection.invert();
        selection.clear();
        selection.deselect();

    },

    errors: false,

    parseErrors: function( errors ) {

        var errorLen = this.errors.length,
            errorMsg = 'Errors:\r';

        if ( errorLen < 1 ) return false;

        for ( var b = 0; b < errorLen; b++ ) {
            errorMsg += this.errors[b];
        }

        return errorMsg;

    },

    getErrors: function() {

        return this.parseErrors( this.errors );

    }

};;

mios.icons = [];;

mios.sizes = {

	iconbundle: [

		[ '@2x', 120 ],
		[ '@3x', 180 ],
		[ '@3x~ipad', 228 ]

	],

    appicon: [

        [ 'AppIcon29x29',          29 ],
        [ 'AppIcon29x29~ipad',     29 ],
        [ 'AppIcon29x29@2x',       58 ],
        [ 'AppIcon29x29@2x~ipad',  58 ],
        [ 'AppIcon29x29@3x',       87 ],
        [ 'AppIcon29x29@3x~ipad',  87 ],

        [ 'AppIcon40x40',          40 ],
        [ 'AppIcon40x40~ipad',     40 ],
        [ 'AppIcon40x40@2x',       80 ],
        [ 'AppIcon40x40@2x~ipad',  80 ],
        [ 'AppIcon40x40@3x',       120 ],
        [ 'AppIcon40x40@3x~ipad',  120 ],

        [ 'AppIcon50x50',          50 ],
        [ 'AppIcon50x50@2x',       100 ]

    ],

    icon: [

        [ 'Icon-40',           40 ],
        [ 'Icon-40@2x',        80 ],
        [ 'Icon-40@3x',        180 ],

        [ 'Icon-Small-40',     40 ],
        [ 'Icon-Small-40@2x',  80 ],
        [ 'Icon-Small-40@3x',  120 ],

        [ 'Icon-Small-50',     50 ],
        [ 'Icon-Small-50@2x',  100 ],
        [ 'Icon-Small-50@3x',  150 ],

        [ 'Icon-Small',        29 ],
        [ 'Icon-Small@2x',     58 ],
        [ 'Icon-Small@3x',     87 ]

    ]

};;

try {
    mios.build( arguments );
    if ( errors = mios.getErrors() ) alert( errors );
} catch (e) {
    alert( 'Program error' );
}