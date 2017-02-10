var koModel = {
    maxPictureSize: 50 * 1024 * 1024,
    itabs: ko.obsa([{
        id: 1,
        frmID: "frmProject",
        name: "информация",
        url: host.arp + "Project/Index/{0}"
    }, {
        id: 3,
        frmID: "frmTasks",
        name: "задачи",
        url: host.arp + "Project/Tasks/{0}"
    }, {
        id: 2,
        frmID: "frmExpenses",
        name: "расходы",
        url: host.arp + "Project/Index/{0}#frmExpenses"
    }, {
        id: 4,
        frmID: "frmBills",
        name: "счета",
        url: host.arp + "Project/Index/{0}#frmBills"
    }, {
        id: 5,
        frmID: "frmSalary",
        name: "начисления",
        url: host.arp + "Project/Payrolls/{0}"
    }, {
        id: 6,
        frmID: "frmFinances",
        name: "финансы",
        url: host.arp + "Project/Index/{0}#frmFinances"
    }, {
        id: 9,
        frmID: "frmFiles",
        name: "файлы",
        selected: true,
        url: "#"
    }]),
    grid: $.fn.koGrid.getSaveSettingsObject(host.p + "#tblFiles", "tblFiles"),
    folder: {
        parentID: ko.obs(),
        parentName: ko.obs(),
        current: ko.obs(),
        selectedArray: ko.obsa([])
    },
    file: {
        current: ko.obs(),
        selectedArray: ko.obsa([])
    },
    filter: { text: ko.obs() },
    path: ko.obsa(),
    busy: ko.obs(false),
    hideThePage: ko.obs(false)
};

$(function () {
    var data = eval("(" + $("#scrData").html().trim() + ")");
    data = toJsObject(data);
    var model = initModel(koModel, data);

    koModel.projectID = data.projects[0].id;

    model.toKo(koModel);
    model.addData(data);
    koModel.project = koModel.projects().first();
    koModel.folder.parentID(data.folder.id);
    koModel.folder.parentName(data.folder.name);
    koModel.path.push({ id: data.folder.id, name: "Проект" });

    koModel.itabs().select("val=>val").forEach(function (row) {
        if (row.url) {
            row.url = row.url.replace("{0}", koModel.projectID);
        }
        var frms = [2, 4, 5, 6];
        if (koModel.project.parentID() && frms.contains(row.id))
            koModel.itabs.remove(row);
    });
    koModel.getModel = function () { return model; };

    koModel.updateAll = function (callback, showQtip) {
        var valid = true;
        $("tab-content form").each(function (it) { valid = valid & $(this).valid(); });

        if (!valid) {
            return false;
        }

        if (typeof koModel.valid == "function") {
            if (!koModel.valid()) {
                return;
            }
        }

        top.busy("UpdateProject");

        model.update(function (result) {
            top.free("UpdateProject");
            var changes = result.changes.updated.any() || result.changes.deleted.any();
            if (showQtip == false || result.canceled.any()) {
            } else if (showQtip == true || changes) {
                window.showTip("Данные успешно сохранены");
            }

            if (typeof callback == "function") {
                callback(result);
            }

            if (changes) {
                model.projects.getByID(koModel.projectID, function () { })
            }
        });
        return true;
    };

    koModel.createFolder = function () {
        var folder = model.folders.create().toKo();
        folder.projectID(koModel.projectID)
        folder.parentID(koModel.folder.parentID());
        koModel.folder.current(folder);
        koModel.folder.edit(folder, "new");
    };
    koModel.openFolder = function (row) {
        var id = ko.get(row.id);
        var name = ko.get(row.name);
        koModel.folder.parentID(id);
        koModel.folder.parentName(id == data.folder.id ? data.folder.name : name);
        var i = koModel.path.indexOf(row);
        if (i < 0)
            koModel.path.push({ id: id, name: name });
        else
            koModel.path(koModel.path.slice(0, i + 1));
        model.folders.refreshData([]);
        model.files.refreshData([]);
        koModel.filter.text("");

        koModel.refresh();

        koModel.uploader.settings.url = host.arp + 'Data/UploadFile/Json/' + id;
    };
    koModel.downloadFolder = function () {
        if (koModel.filter.text()) {
            var folders = koModel.folders().select("val => val.id()");
            var files = koModel.files().select("val => val.id()");
            window.location = host.arp + "Project/DownloadFiles/" + koModel.projectID + "?Folders=" + folders.join(",") + "&Files=" + files.join(",");
        }
        else {
            window.location = host.arp + "Data/DownloadFolder/" + koModel.folder.parentName() + "?FolderID=" + koModel.folder.parentID();
        }
    };
    koModel.downloadSelected = function () {
        var folders = koModel.folder.selectedArray();
        var files = koModel.file.selectedArray();
        window.location = host.arp + "Project/DownloadFiles/" + koModel.projectID + "?Folders=" + folders.join(",") + "&Files=" + files.join(",");
    };

    koModel.setHeight = function () {
        $("div.line").css({ height: 0, paddingTop: 0 });
        var h = $(window).height() - 200;

        $(".container .tab-content").each(function () {
            var frm = $(this);
            var frmh = frm.height();

            if (frmh < h) {
                frm.css("min-height", h + "px");
            }
        });
        $("#divFiles").height(h);
    };

    koModel.searchKeyPress = function (data, event) {
        if (event.keyCode == 13 || event.which == 13) {
            var element = $(event.target);
            setTimeout(function () {
                element.change();
                if (!koModel.busy()) {
                    koModel.refresh();
                }
            }, 100);
        }
        return true;
    };

    initFiles(koModel, model, data);
    initUploader(koModel, model, data);

    ko.apply(koModel);

    koModel.setHeight();
    $(window).resize(function () {
        koModel.setHeight();
        //koModel.setWidth();
    });

});

function initModel(koModel, data) {
    var model = new ejs.model({
        sets:
        [{
            name: "projects",
            mode: "details",
            properties: data.projectProperties.select("val=>ejs.toJsName(val)"),
            belongs: ["contractor", { name: "subcontractor", setName: "contractors" }, "contract", { name: "responsible", setName: "users", fkProperty: "responsibleID" }],
            hasMany: ["projectFiles", "contracts", { name: "stages", setName: "projectStages" }, { name: "works", setName: "projectWorks" }, { name: "allPayments", setName: "payments" }]
        }, {
            name: "folders",
            properties: ["name", "url", "createDate", "projectID", "parentID"],
            belongs: ["project"],
            hasMany: ["files"]
        }, {
            name: "files",
            properties: ["name", "url", "createDate", "folderID", "size"],
            belongs: ["folder"]
        }]
    });

    model.events.koCreated.attach(function (e) {
        if (e.className == "project") {

        } else if (e.className == "folder") {
            e.ko.include(["project", "files"]);
        } else if (e.className == "file") {
            e.ko.include(["folder"]);
        }
    });
    model.events.updated.attach(function (e) {
        if (e.model.hasChanges())
            return;
    });

    return model;
};

function initFiles(koModel, model, data) {
    koModel.refresh = function () {
        koModel.folder.selectedArray([]);
        koModel.file.selectedArray([]);
        top.busy("refresh");
        $.rjson({
            url: host.arp + "Project/FilesJson/" + koModel.projectID,
            data: { FolderID: koModel.folder.parentID(), Filter: koModel.filter.text() },
            success: function (result) {
                top.free("refresh");
                result = toJsObject(result);
                model.refreshData(result);
            }
        });
    };

    koModel.folder.edit = function (row, action) {
        if (!row) {
            return;
        }
        koModel.folder.current(row);
        row.entity.backup();
        $("#divFolder").dialog("open");
        $("#divFolder").dialog({ title: action == "new" ? "Новая папка" : row.name() });
    };

    koModel.folder.cancel = function () {
        var row = koModel.folder.current();
        if (row.id() < 0)
            row.entity.remove();
        else
            row.entity.restore();
        koModel.folder.current(null);
        $("#divFolder").dialog("close");
    };

    koModel.folder.update = function () {
        var row = koModel.folder.current();
        if (!$("#frmFolder").valid()) {
            return;
        }
        row.entity.commit();
        koModel.updateAll(function () {
            koModel.folder.current(null);
        });
        $("#divFolder").dialog("close");
    };

    koModel.folder.remove = function (row) {
        var folders = [];
        if (row.entity) {
            koModel.folder.selectedArray([]);
            folders.push(row);
        } else {
            folders = koModel.folder.selectedArray().select(function (it) { return koModel.folders().first("val=>val.id()==" + it); });
        }

        var names = ["папку", "папки", "папок"];
        var message = ["Вы действительно хотите удалить ",
                       folders.length == 1 ? names[0] + " " + folders[0].name() : folders.length + " " + i18n.declineCount(folders.length, names[0], names[1], names[2]),
                       "?"].join("");

        if (folders.length == 0 || (folders.any("val=>val.id()>0") && !confirm(message))) {
            return;
        }
        folders.forEach(function (it) {
            it.entity.remove();
        });
        koModel.updateAll(function () {
            koModel.folder.selectedArray([]);
        });
    };

    koModel.file.edit = function (row, action) {
        if (!row) {
            return;
        }
        koModel.file.current(row);
        row.entity.backup();
        $("#divFile").dialog("open");
        $("#divFile").dialog({ title: row.name() });
    };

    koModel.file.cancel = function () {
        var row = koModel.file.current();
        if (row.id() < 0)
            row.entity.remove();
        else
            row.entity.restore();
        koModel.file.current(null);
        $("#divFile").dialog("close");
    };

    koModel.file.update = function () {
        var row = koModel.file.current();
        if (!$("#frmFile").valid()) {
            return;
        }
        row.entity.commit();
        koModel.updateAll(function () {
            koModel.file.current(null);
        });
        $("#divFile").dialog("close");
    };

    koModel.file.remove = function (row) {
        var files = [];
        if (row.entity) {
            koModel.file.selectedArray([]);
            files.push(row);
        } else {
            files = koModel.file.selectedArray().select(function (it) { return koModel.files().first("val=>val.id()==" + it); });
        }

        var names = ["файл", "файла", "файлов"];
        var message = ["Вы действительно хотите удалить ",
                       files.length == 1 ? names[0] + " " + files[0].name() : files.length + " " + i18n.declineCount(files.length, names[0], names[1], names[2]),
                       "?"].join("");

        if (files.length == 0 || (files.any("val=>val.id()>0") && !confirm(message))) {
            return;
        }
        files.forEach(function (it) {
            it.entity.remove();
        });
        koModel.updateAll(function () {
            koModel.file.selectedArray([]);
        });
    };

    var gridSettings = data.settings.first("val=>val.name=='" + koModel.grid.name + "'");
    if (gridSettings) {
        gridSettings = eval("(" + gridSettings.value + ")");
    }

    $("#tblFiles").koGrid({
        koTemplateID: "trItem",
        headerContainer: $("#divFilesHeader"),
        //container: $("#divFiles"),
        styleID: "stlFilesGrid",
        tableID: "tblFiles",
        columns: gridSettings || [],
        sortable: true,
        disallowSort: ["Save", "Select"]
    });

    $("#divFolder,#divFile").dialog({
        autoOpen: false,
        draggable: true,
        resizable: false,
        modal: true,
        width: 550
    });

    $("#frmFolder,#frmFile").validate({
        errorClass: "invalid",
        errorPlacement: errorPlacement
    });

    koModel.refresh();
};

function initUploader(koModel, model, data) {
    var uploaderInitHtml = null;
    var uploader = koModel.uploader = new plupload.Uploader({
        runtimes: 'gears,html5,flash,silverlight,browserplus',
        browse_button: 'btnAddFile',
        drop_element: 'divContainer',
        //container: 'divPicturesUploaderArea',
        max_file_size: '50mb',
        url: host.arp + 'Data/UploadFile/Json/' + koModel.folder.parentID(),
        flash_swf_url: host.arp + 'Scripts/Plupload/plupload.flash.swf',
        silverlight_xap_url: host.arp + 'Scripts/Plupload/plupload.silverlight.xap',
        //filters: [{ title: "Jpeg картинки", extensions: "jpg,jpeg" }, { title: "Png картинки", extensions: "png" }]
        //resize: { width: 320, height: 240, quality: 90 }
    });

    uploader.init();

    uploader.bind('FilesAdded', function (up, files) {
        for (var i = 0; i < files.length; i++) {
            if (files[i].status != 1) {
                uploader.removeFile(files[i].id);
                continue;
            }
            var e = { file: files[i] };
            koModel.onFileSelected.raise(e);
            if (e.cancel) {
                uploader.removeFile(files[i]);
            }
        }
        up.refresh(); // Reposition Flash/Silverlight

        uploader.start();
    });

    uploader.bind('Error', function (up, err) {
        var m = "Ошибка";
        //var messages = [];
        //messages[-601] = "Вы можете загружать только изображения типа .png, .jpg, .jpeg, .gif или .bmp!";
        //var message = messages[err.code];
        console.warn(err);
        ejs.alert(m, err.code);//message);

        up.refresh(); // Reposition Flash/Silverlight
    });

    uploader.bind('FileUploaded', function (up, file, result) {
        var e = ejs.toJsObject(eval("(" + result.response + ")"));
        koModel.onFileUploaded.raise(e);
    });

    uploader.bind("StateChanged", function (up) {
        koModel.busy(up.state == 2);
    });

    koModel.onFileSelected = ejs.createEvent();
    koModel.onFileUploaded = ejs.createEvent();
    koModel.onFileSelected.attach(function (e) {
        //if (!/(\.png|\.jpg|\.jpeg|\.gif|\.bmp)$/gi.test(e.file.name)) {
        //    ejs.alert("Неправильный файл", "Вы можете загружать только изображения типа .png, .jpg, .jpeg, .gif или .bmp!");
        //    e.cancel = true;
        //    return;
        //}
        if (typeof FileReader !== "undefined") {
            var size = e.file.size;// input.files[0].size;
            if (size > koModel.maxPictureSize) {
                alertSize();
                e.cancel = true;
                return;
            }
        }
    });
    koModel.onFileUploaded.attach(function (e) {
        if (e.code == 200) {
            model.files.addData([e.file]);
            //var itemPicture = model.itemPictures.create();
            //itemPicture.name(e.file.name);
            //itemPicture.fileID(e.file.id);
            //itemPicture.fileName(e.file.name);
            //itemPicture.itemID(koModel.item.id());
            //itemPicture.publish(true);
            //if (koModel.offer.id() > 0) {
            //    koModel.updateAll();
            //}
            //} else if (e.message == "Incorrect extension") {
            //    ejs.alert("Неправильный файл", "Вы можете загружать только изображения типа .png, .jpg, .jpeg, .gif или .bmp!");
        } else if (e.message == "Incorrect size") {
            alertSize();
        } else {
            ejs.alert(e.message, e.message);
        }
    });

    var alertSize = function () {
        ejs.alert("Файл слишком большой", "Вы не можете загружать изображения более " + Math.floor(koModel.maxPictureSize / 1024 / 1024) + " МБ!");
    };
};