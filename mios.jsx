var mios = {

    icons: false,

    getIcons: function() {

        return this.icons;

    },

    sizes: false,

    getSizes: function( type ) {

        return this.sizes[type];

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

            var iconSizes = [],
                iconObj = iconList[i],
                iconDir,
                iconDoc,
                bundleFolder,
                iconBundleFolder,
                iconFolder,
                selection;

            if ( !iconObj.psd_id ) continue;

            if ( iconDir = dirIcons.getFiles(iconObj.psd_id + '.psd')[0] ) {
                iconDoc = open( iconDir );
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

            if ( args.length > 0 && args[0] === 'test' ) {
                iconDoc.close( SaveOptions.DONOTSAVECHANGES );
                continue;
            }

            if ( iconObj.icons ) {

                iconFolder = iconObj.icons.folder && iconObj.icons.folder !== '' ? iconObj.icons.folder : false;

                if ( iconObj.icons.iconbundle ) {
                    iconBundleFolder = new Folder( (new File($.fileName)).parent + "/dist/mios/IconBundles/" + ( iconFolder ? iconFolder : '' ) );
                } else {
                    bundleFolder = new Folder( (new File($.fileName)).parent + "/dist/mios/Bundles/" + iconObj.bundle_id + ( iconFolder ? iconFolder : '' ) );
                }
                
                if ( !bundleFolder.exists ) bundleFolder.create();

                if ( iconObj.icons.appicon ) iconSizes.push( this.getSizes('appicon') );
                if ( iconObj.icons.icon ) iconSizes.push( this.getSizes('icon') );
                if ( iconObj.icons.custom ) iconSizes.push( iconObj.icons.custom );
                
                if ( iconObj.icons.iconbundle ) {

                    var iconbundleSizes = this.getSizes('iconbundle');
                    
                    for ( var b = 0; b < iconbundleSizes.length; b++ ) {
                        iconSizes.push([
                            [ iconObj.bundle_id + iconbundleSizes[b][0], iconbundleSizes[b][1] ]
                        ]);
                    }

                }

                iconSizes = this.sortSizes( iconSizes );

            }

            if ( iconSizes && iconSizes.length > 0 ) {

                if ( iconObj.mask && iconObj.mask !== '' ) {

                    iconDoc.artLayers.getByName('Background').isBackgroundLayer = false;

                    this.drawMask( this.getMaskPoints() );
                    selection = app.activeDocument.selection;
                    selection.invert();
                    selection.clear();
                    selection.deselect();

                }

                for ( var j = 0, iconSizesLen = iconSizes.length; j < iconSizesLen; j++ ) {

                    var iconFile,
                        iconFilePath = '';
                    iconFilePath += "/" + iconSizes[j][0] + ( iconSizes[j][2] && iconSizes[j][2] !== '' ? '' : ".png" );
                    app.activeDocument.resizeImage( iconSizes[j][1], iconSizes[j][1], undefined, ResampleMethod.BICUBICSHARPER);
                    iconFile = new File( decodeURI(bundleFolder) + iconFilePath );

                    if ( args.length > 0 && args[0] === 'compressed' ) {
                        this.save( iconFile, true );
                    } else {
                        this.save( iconFile, false );
                    }

                }

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

        pathItem.makeSelection();
        pathItem.remove();

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

mios.icons = [];

mios.icons.push({
    name: 'Apple Airport Utility',
    bundle_id: 'com.apple.airport.mobileairportutility',
    app_id: false,
    psd_id: 'apple_wifi',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple App Store',
    bundle_id: 'com.apple.AppStore',
    app_id: 'AppStore.app',
    psd_id: 'apple_app_store',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Assistant',
    bundle_id: 'com.apple.AssistantServices',
    app_id: false,
    psd_id: 'apple_assistant',
    icons: {
        iconbundle: true
    }
});


mios.icons.push({
    name: 'Apple Calculator',
    bundle_id: 'com.apple.calculator',
    app_id: 'Calculator.app',
    psd_id: 'apple_calculator',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Calendar (Settings)',
    bundle_id: 'com.apple.mobilecal',
    app_id: 'MobileCal.app',
    psd_id: 'apple_calendar',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Calendar (Icon)',
    bundle_id: 'com.apple.mobilecal',
    app_id: 'MobileCal.app',
    psd_id: 'apple_calendar_icon',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Camera',
    bundle_id: 'com.apple.camera',
    app_id: 'Camera.app',
    psd_id: 'apple_camera',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Camera Roll',
    bundle_id: 'com.apple.mobileslideshow',
    app_id: 'MobileSlideShow.app',
    psd_id: 'apple_camera_roll',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Clock',
    bundle_id: 'com.apple.springboard',
    app_id: false,
    psd_id: 'apple_clock',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Clock Alt',
    bundle_id: 'com.apple.springboard',
    app_id: false,
    psd_id: 'apple_clock_alt',
    folder: '/alt',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Compass',
    bundle_id: 'com.apple.compass',
    app_id: 'Compass.app',
    psd_id: 'apple_compass',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Contacts',
    bundle_id: 'com.apple.MobileAddressBook',
    app_id: 'Contacts.app',
    psd_id: 'apple_contacts',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Facetime',
    bundle_id: 'com.apple.facetime',
    app_id: 'FaceTime.app',
    psd_id: 'apple_facetime',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Find My Friends',
    bundle_id: 'com.apple.mobileme.fmf1',
    app_id: 'FindMyFriends.app',
    psd_id: 'apple_find_my_friends',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Find My iPhone',
    bundle_id: 'com.apple.mobileme.fmip1',
    app_id: 'FindMyiPhone.app',
    psd_id: 'apple_find_my_iphone',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Find My iPhone',
    bundle_id: 'com.apple.castlesettings',
    app_id: 'FindMyiPhone.app',
    psd_id: 'apple_find_my_iphone',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Game Center',
    bundle_id: 'com.apple.gamecenter',
    app_id: 'Game Center.app',
    psd_id: 'apple_game_center',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Garage Band',
    bundle_id: 'com.apple.mobilegarageband',
    app_id: 'MobileGarageBand.app',
    psd_id: 'apple_garage_band',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Health',
    bundle_id: 'com.apple.Health',
    app_id: 'Health.app',
    psd_id: 'apple_health',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple iBooks',
    bundle_id: 'com.apple.iBooks',
    app_id: 'iBooks.app',
    psd_id: 'apple_ibooks',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple iCloud Drive',
    bundle_id: 'com.apple.iCloudDriveApp',
    app_id: false,
    psd_id: 'apple_icloud',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple iMovie',
    bundle_id: 'com.apple.iMovie',
    app_id: 'iMovie.app',
    psd_id: 'apple_imovie',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple iTunes Store',
    bundle_id: 'com.apple.MobileStore',
    app_id: 'MobileStore.app',
    psd_id: 'apple_itunes_store',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple iTunes University',
    bundle_id: 'com.apple.itunesu',
    app_id: 'iTunesU.app',
    psd_id: 'apple_itunes_u',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Keynote',
    bundle_id: 'com.apple.Keynote',
    app_id: 'Keynote.app',
    psd_id: 'apple_keynote',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Mail',
    bundle_id: 'com.apple.mobilemail',
    app_id: 'MobileMail.app',
    psd_id: 'apple_mail',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Maps',
    bundle_id: 'com.apple.Maps',
    app_id: 'Maps.app',
    psd_id: 'apple_maps',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Music',
    bundle_id: 'com.apple.Music',
    app_id: 'Music.app',
    psd_id: 'apple_music',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Notes',
    bundle_id: 'com.apple.mobilenotes',
    app_id: 'MobileNotes.app',
    psd_id: 'apple_notes',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Numbers',
    bundle_id: 'com.apple.Numbers',
    app_id: 'Numbers.app',
    psd_id: 'apple_numbers',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Pages',
    bundle_id: 'com.apple.Pages',
    app_id: 'Pages.app',
    psd_id: 'apple_pages',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Passbook',
    bundle_id: 'com.apple.Passbook',
    app_id: 'Passbook.app',
    psd_id: 'apple_passbook',
    icons: {
        icon: true
    }
});

mios.icons.push({
    name: 'Apple Phone',
    bundle_id: 'com.apple.mobilephone',
    app_id: 'MobilePhone.app',
    psd_id: 'apple_phone',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Podcasts',
    bundle_id: 'com.apple.podcasts',
    app_id: 'Podcasts.app',
    psd_id: 'apple_podcasts',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Preferences',
    bundle_id: 'com.apple.Preferences',
    app_id: 'Preferences.app',
    psd_id: 'apple_preferences',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Reminders',
    bundle_id: 'com.apple.reminders',
    app_id: 'Reminders.app',
    psd_id: 'apple_reminders',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Remote',
    bundle_id: 'com.apple.Remote',
    app_id: 'Remote.app',
    psd_id: 'apple_remote',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Safari',
    bundle_id: 'com.apple.mobilesafari',
    app_id: 'MobileSafari.app',
    psd_id: 'apple_safari',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple SMS',
    bundle_id: 'com.apple.MobileSMS',
    app_id: 'MobileSMS.app',
    psd_id: 'apple_sms',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Stocks',
    bundle_id: 'com.apple.stocks',
    app_id: 'Stocks.app',
    psd_id: 'apple_stock',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Store',
    bundle_id: 'com.apple.store.Jolly',
    app_id: 'Apple Store.app',
    psd_id: 'apple_store',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple TestFlight',
    bundle_id: 'com.apple.TestFlight',
    app_id: 'TestFlight.app',
    psd_id: 'apple_testflight',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Tips',
    bundle_id: 'com.apple.tips',
    app_id: 'Tips.app',
    psd_id: 'apple_tips',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Trailers',
    bundle_id: 'com.apple.movietrailers',
    app_id: false,
    psd_id: 'apple_trailers',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Videos',
    bundle_id: 'com.apple.videos',
    app_id: 'Videos.app',
    psd_id: 'apple_videos',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Voice Memos',
    bundle_id: 'com.apple.VoiceMemos',
    app_id: 'VoiceMemos.app',
    psd_id: 'apple_voice_memos',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Watch',
    bundle_id: 'com.apple.Bridge',
    app_id: false,
    psd_id: 'apple_watch',
    icons: {
        iconbundle: true
    }
});

mios.icons.push({
    name: 'Apple Weather',
    bundle_id: 'com.apple.weather',
    app_id: 'Weather.app',
    psd_id: 'apple_weather',
    icons: {
        iconbundle: true
    }
});;

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
        [ 'AppIcon50x50@2x',       100 ],

        [ 'AppIcon57x57',          57 ],
        [ 'AppIcon57x57@2x',       114 ],

        [ 'AppIcon60x60',          60 ],
        [ 'AppIcon60x60@2x',       120 ],
        [ 'AppIcon60x60@3x',       180 ],

        [ 'AppIcon72x72',          72 ],
        [ 'AppIcon72x72~ipad',     72 ],
        [ 'AppIcon72x72@2x',       144 ],
        [ 'AppIcon72x72@2x~ipad',  144 ],

        [ 'AppIcon76x76',          76 ],
        [ 'AppIcon76x76~ipad',     76 ],
        [ 'AppIcon76x76@2x',       152 ],
        [ 'AppIcon76x76@2x~ipad',  152 ],

        [ 'AppIcon120x120',        120 ]

    ],

    icon: [

        [ 'Icon',              60 ],
        [ 'Icon@2x',           120 ],
        [ 'Icon@3x',           180 ],

        [ 'Icon-40',           40 ],
        [ 'Icon-40@2x',        80 ],
        [ 'Icon-40@3x',        180 ],

        [ 'Icon-60',           60 ],
        [ 'Icon-60@2x',        120 ],
        [ 'Icon-60@3x',        180 ],

        [ 'Icon-72',           72 ],
        [ 'Icon-72@2x',        144 ],
        [ 'Icon-72@3x',        216 ],

        [ 'Icon-76',           76 ],
        [ 'Icon-76@2x',        152 ],
        [ 'Icon-76@3x',        228 ],

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