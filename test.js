// function req() {
//     Ext.require('test.view.objects.SearchWindow', function() {
//                     console.log('load...')
//                 });
// }


Ext.require('test.view.objects.SearchWindow100500', function() {
                    console.log('load...')
                });

Ext.define('test.Test', {
    extend: 'test.OldTest',
    alternateClassName: 'test',
    requires: [
        'test.log.Logger',
        'test.data.BigData'
    ],

    controller: 'objects',
    controllers: [
        'test.view.Controller1',
        'test.view.Controller2',
        'test.view.Controller3'
    ],


    method: () => {
        Ext.require('test.view.objects.SearchWindow', () => {})
        Ext.require('test.view.objects.SearchWindow1', () => {})
    }
})
