ngapp.service('mergeService', function(settingsService, mergeDataService, objectUtils, gameService) {
    let service = this,
        mergeExportKeys = ['name', 'filename', 'method', 'useGameLoadOrder', 'loadOrder', 'buildMergedArchive', 'archiveAction', 'handleFaceData', 'handleVoiceData', 'handleBillboards', 'handleScriptFragments', 'handleStringFiles', 'handleTranslations', 'handleIniFiles', 'copyGeneralAssets', 'dateBuilt'],
        pluginExportKeys = ['filename', 'hash', 'dataFolder'],
        mergeMethodMap = { Clamp: 'Clobber', Refactor: 'Clean' };

    // private functions
    let initMergeData = mergeDataService.clearMergeData;

    let getMergePath = function() {
        let mergePath = settingsService.settings.mergePath;
        fh.jetpack.dir(mergePath);
        return mergePath;
    };

    let getNewMergeName = function() {
        let mergeName = 'New Merge',
            counter = 1,
            mergePath = getMergePath(),
            directories = fh.getDirectories(mergePath).map(fh.getFileName);
        while (directories.includes(mergeName))
            mergeName = `New Merge ${++counter}`;
        return mergeName;
    };

    let exportMerge = function(merge) {
        let mergeObj = objectUtils.rebuildObject(merge, mergeExportKeys);
        mergeObj.plugins = merge.plugins.map(plugin => {
            return objectUtils.rebuildObject(plugin, pluginExportKeys);
        });
        return mergeObj;
    };

    let getFidCache = function(merge) {
        let fids = merge.plugins.map(() => []);
        Object.keys(merge.usedFids).forEach(key => {
            let index = merge.usedFids[key];
            if (index > -1) fids[index].push(key);
        });
        return fids.reduce((obj, a, index) => {
            let filename = merge.plugins[index].filename;
            obj[filename] = a;
            return obj;
        }, {});
    };

    let getPluginHash = function(plugin) {
        let pluginPath = fh.path(gameService.dataPath, plugin.filename);
        plugin.hash = fh.getMd5Hash(pluginPath);
    };

    let importMergeData = function(merge) {
        let mergeFolder = service.getMergeFolder(merge),
            oldMerge = fh.loadJsonFile(fh.path(mergeFolder, 'merge.json'));
        merge = Object.assign(service.newMerge(), merge);
        merge.method = mergeMethodMap[merge.method] || merge.method;
        if (merge.archiveAction === 'Merge') {
            merge.buildMergedArchive = true;
            merge.archiveAction = 'Extract';
        }
        merge.oldPlugins = oldMerge && oldMerge.plugins;
        merge.plugins.forEach(getPluginHash);
        return merge;
    };

    // public api
    this.getMergeFolder = function(merge) {
        let baseFolder = fh.path(getMergePath(), merge.name);
        let mergeFolders = fh.getFiles(baseFolder, {
            matching: 'merge*',
            directories: true,
            files: false
        });
        return mergeFolders[0] || fh.path(baseFolder, 'merge');
    };

    this.newMerge = function() {
        let mergeName = getNewMergeName();
        return initMergeData({
            name: mergeName,
            filename: `${mergeName}.esp`,
            method: 'Clobber',
            plugins: [],
            loadOrder: [],
            archiveAction: 'Extract',
            buildMergedArchive: false,
            useGameLoadOrder: false,
            handleFaceData: true,
            handleVoiceData: true,
            handleBillboards: true,
            handleScriptFragments: true,
            handleStringFiles: true,
            handleTranslations: true,
            handleIniFiles: true,
            copyGeneralAssets: false
        });
    };

    this.saveMerges = function() {
        let mergeData = service.merges.map(exportMerge);
        fh.saveJsonFile(service.mergeDataPath, mergeData);
    };

    this.loadMerges = function() {
        if (service.merges) return;
        let profileName = settingsService.currentProfile;
        service.mergeDataPath = `profiles/${profileName}/merges.json`;
        let merges = fh.loadJsonFile(service.mergeDataPath) || [];
        service.merges = merges.map(importMergeData);
        service.saveMerges();
    };

    this.saveMergeData = function(merge) {
        let folderPath = fh.path(merge.dataPath, `merge - ${merge.name}`),
            mergePath = fh.path(folderPath, 'merge.json'),
            mapPath = fh.path(folderPath, 'map.json'),
            fidCachePath = fh.path(folderPath, 'fidCache.json');
        fh.jetpack.dir(folderPath);
        fh.saveJsonFile(mergePath, exportMerge(merge));
        fh.saveJsonFile(mapPath, merge.fidMap || {});
        fh.saveJsonFile(fidCachePath, getFidCache(merge), true);
    };

    this.getMergeDataPath = function(merge) {
        return `${getMergePath()}\\${merge.name}`;
    };
});
