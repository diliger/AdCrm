var koModel = {
    maxPictureSize: 50 * 1024 * 1024,
    task: ko.obs(),
    typeID: ko.obs(""),
    filesSender: ko.obs("task"),
    hideThePage: ko.obs(false),
    busy: ko.obs(false),
    canceling: false,
    addedFiles: [],
    prevTaskID: ko.obs(""),
    nextTaskID: ko.obs(""),
    systemVisible: ko.obs(false),
    financeVisible: ko.obs(false),
    toggleSystemVisible: function () { koModel.systemVisible(!koModel.systemVisible()); },
    toggleFinanceVisible: function () { koModel.financeVisible(!koModel.financeVisible()); },
    pagePart: "Client/Tasks",
    newMessageFiles: ko.obsa([]),
    newMessageNotify: {
        contractor: ko.obs(false), employee: ko.obs(true), creator: ko.obs(false), responsible: ko.obs(true), last: ko.obs(true), another: ko.obs(false), userID: ko.obs(""), userName: ko.obs(""),
        contractorVisible: null, employeeVisible: null, creatorVisible: null, responsibleVisible: null, lastVisible: ko.obs(true), anotherVisible: ko.obs(true)
    },
    needRefresh: false
};

$(function () {
    var data = eval("(" + $("#scrData").html().trim() + ")");
    data = ejs.toJsObject(data);
    var model = initModel(koModel, data);
    model.addData(data);
    model.toKo(koModel);

    if (data.taskType) {
        koModel.pagePart = data.taskType.sysName == "Bug" ? "Client/Bugs" : koModel.pagePart;
    }

    if (data.task) {
        model.projectTasks.addData([data.task]);
        koModel.task(koModel.projectTasks().first());
        model.projectTaskMessages.addData(data.messages);
        model.projectFiles.addData(data.files);

        koModel.prevTaskID(data.prevTaskID);
        koModel.nextTaskID(data.nextTaskID);
    } else {
        var task = model.projectTasks.create();
        task = task.toKo();
        task.priorityID(host.taskPriorities.normal);
        koModel.task(task);
        if (data.projectID) {
            var project = koModel.projects().first("val=>val.id()==" + data.projectID);
            if (project) {
                task.projectID(project.id());
                task.projectName(project.fullName());
            }
        } else if (data.projects.length == 1) {
            var project = data.projects[0];
            task.projectID(project.id);
            task.projectName(project.fullName);
        }

        if (data.employee) {
            task.employeeID(data.employee.id);
            task.employeeName(data.employee.fullName);
        }

        if (data.taskType) {
            task.typeID(data.taskType.id);
        } else {
            var dt = koModel.taskTypes().first("val=>val.sysName()=='Task'");
            task.typeID(dt ? dt.id() : "");
        }
    }

    koModel.newMessageNotify.contractorVisible = ko.cmp(function () {
        if (!koModel.task().project())
            return false;
        var cid = koModel.task().project().contractorID();
        return cid > 0 && cid != host.cid;
    });

    koModel.newMessageNotify.employeeVisible = ko.cmp(function () {
        var eid = koModel.task().employeeID();
        return eid > 0 && eid != host.eid;
    });

    koModel.newMessageNotify.creatorVisible = ko.cmp(function () {
        var creator = koModel.task().creator();
        return creator && creator != host.login;
    });

    koModel.newMessageNotify.responsibleVisible = ko.cmp(function () {
        var rid = koModel.task().responsibleID();
        return rid > 0 && rid != host.uid;
    });

    koModel.newMessageNotify.lastVisible = ko.cmp(function () {
        var last = koModel.task().messages().orderBy('val=>val.id()>0?val.id()*-1:0').first();
        return last && last.creator() && last.creator() != host.login;
    });

    koModel.newMessageNotify.stringify = function () {
        var result = [];
        var n = koModel.newMessageNotify;
        var fields = ["contractor", "employee", "creator", "responsible", "last", "another"];
        for (var i = 0; i < fields.length; i++) {
            var f = fields[i];
            var v = n[f]() && n[f + "Visible"]();
            if (v) {
                if (f != "another") {
                    result.push(f);
                } else if (n.userID()) {
                    result.push(f + ":" + n.userID());
                }
            }
        }
        return result.join(";");
    };

    koModel.loadProjects = function (request, callback, row) {
        var name = row.projectName().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var where = [ejs.cwp("deleted", false, "=", "bool"), ejs.cwp("archived", false, "=", "bool"), ejs.cwp("statusID", host.projectStatuses.closed, "!=", "number")];
        if (filter) {
            var w = ejs.cwp("fullName", "%" + filter + "%", "like");
            where.push(w);
        }
        if (host.cid) {
            where.push(ejs.cwp("contractorID", host.cid, "", "number"));
        }

        model.select(ejs.cso(model.projects, where, [ejs.cop("fullName")], 20), function (result) {
            model.addData(result.collections);
            callback(result.collections.projects.select(function (it, i) {
                return { label: it.fullName, value: it.fullName, source: it };
            }));
        });
    };

    koModel.loadInvoices = function (request, callback, row) {
        var name = row.invoiceNumber().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var project = koModel.task().project();
        var projectID = koModel.task().projectID() || -1;
        if (project && project.parentID()) {
            projectID = [projectID, project.parentID()];
        }

        var where = [ejs.cwp("nulled", false, "=", "bool"),
            ejs.cwp("project", true, "", "group", "", "",
                [ejs.cwp("projectID", projectID, "", "number", "or"),
                ejs.cwp("project.ParentID", projectID, "", "number", "or")])];

        if (filter) {
            var w = ejs.cwp("number", "%" + filter + "%", "like");
            where.push(w);
        }

        model.select(ejs.cso(model.invoices, where, [ejs.cop("number")], 20), function (result) {
            model.addData(result.collections);
            callback(result.collections.invoices.select(function (it, i) {
                return { label: it.number, value: it.number, source: it };
            }));
        });
    };

    koModel.loadEmployees = function (request, callback, row) {
        var name = row.employeeName().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var where = [ejs.cwp("deleted", false, "=", "bool"), ejs.cwp("archived", false, "=", "bool")];
        if (filter) {
            var w = ejs.cwp("fullName", "%" + filter + "%", "like");
            where.push(w);
        }

        model.select(ejs.cso(model.employees, where, [ejs.cop("fullName")], 20), function (result) {
            model.addData(result.collections);
            callback(result.collections.employees.select(function (it, i) {
                return { label: it.fullName, value: it.fullName, source: it };
            }));
        });
    };

    koModel.loadUsers = function (request, callback, row) {
        var name = row.userName().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var where = [ejs.cwp("deleted", false, "=", "bool")];
        if (filter) {
            var w = ejs.cwp("fullName", "%" + filter + "%", "like");
            where.push(w);
        }

        model.select(ejs.cso(model.users, where, [ejs.cop("fullName")], 20), function (result) {
            model.addData(result.collections);
            callback(result.collections.users.select(function (it, i) {
                return { label: it.fullName, value: it.fullName, source: it };
            }));
        });
    };

    koModel.editName = function (a, e) {
        setTimeout(function () {
            $(e.target).parents(".task-name:first").hide().parent().find('input').show().focus();
        }, 50);
    };

    koModel.updateAll = function (next) {
        var row = koModel.task();

        var valid = true;
        var m = "Эти поля необходимо заполнить: ";
        var f = [];
        $("#frmTask").each(function () {
            valid = valid & $(this).valid();
            $(this).find(".invalid").each(function () {
                var el = $(this);
                f.push("<span class='text-error'>" + (el.attr("title") || el.attr("placeholder").replace(/[.]*$/, "")) + "</span>");
            });
        });
        if (!valid) {
            m += f.join(", ");

            ejs.alert("Заполните обязательные поля!", m);
            return;
        }

        var m = row.newMessage();
        if (m || koModel.newMessageFiles().any()) {
            m = m || "добавлены файлы";
            var notify = koModel.newMessageNotify.stringify();
            var mess = model.projectTaskMessages.create();
            mess.taskID(row.id());
            mess.text(m);
            mess.notify(notify);
            row.message(m);
            koModel.newMessageFiles().forEach(function (it) {
                it.projectTaskMessageID(mess.id());
            });
            koModel.newMessageFiles([]);
        }

        var create = row.id() < 0;
        var r = model.update(function () {
            ejs.free(r);
            if (!koModel.hasChanges()) {
                if (next === true) {
                    window.location = host.arp + koModel.pagePart + "/Details?ProjectID=" + row.projectID() + "&EmployeeID=" + row.employeeID();
                    return;
                } else if (next == "close") {
                    koModel.cancel();
                    return;
                }
            }

            if (create && row.id() > 0) {
                window.location = host.arp + koModel.pagePart + "/Details/" + row.id();
                return;
            }
        });

        if (r) {
            ejs.busy(r);
        }
    };

    koModel.updateAndAdd = function () {
        koModel.updateAll(true);
    };

    koModel.updateAndClose = function () {
        koModel.updateAll("close");
    };

    koModel.remove = function () {
        var task = koModel.task();
        if (task.id() < 0) {
            koModel.cancel();
            return;
        }
        var m = ["Вы действительно хотите удалить задачу ", task.id(), ". ", task.name(), "?"].join("");
        ejs.confirmRemove("Подтвердите удаление", m, function () {
            if (koModel.hasChanges()) {
                model.cancelChanges();
            }
            task.deleted(true);
            koModel.updateAndClose();
        });
    };

    koModel.cancel = function () {
        koModel.canceling = true;
        model.cancelChanges();
        var files = koModel.addedFiles;
        files.forEach(function (it) { it.entity.remove(); });
        model.update(function () {
            koModel.canceling = false;
        });
        model.clearChanges();

        if (document.referrer.contains(koModel.pagePart) && !document.referrer.contains("/Details")) {
            window.location = document.referrer;
        } else {
            window.location = host.arp + koModel.pagePart;
        }
    };

    koModel.removeFile = function (file) {
        var m = "Вы действительно хотите удалить файл " + file.fileName() + "?";
        ejs.confirmRemove("Удаление файла " + file.fileName(), m, function () {
            file.entity.remove();
            koModel.newMessageFiles.remove(file);
        });
    };

    koModel.removeMessage = function (row) {
        var m = "Вы действительно хотите удалить комментарий от " + row.creatorName() + " " + row.createDate() + "?";
        ejs.confirmRemove("Удаление комментария от " + row.creatorName(), m, function () {
            row.entity.remove();
        });
    };

    ko.apply(koModel);
    initUploader(koModel, model, data);

    var fnCkUpdate = function (a, e) {
        a.editor.updateElement();
        var id = a.editor.element.getAttribute("id");
        id = id.substring(3);
        id = id.substring(0, 1).toLowerCase() + id.substring(1);
        koModel.task()[id](a.editor.getData());
    };

    CKEDITOR.on('instanceReady', function (e) {
        e.editor.commands.save.exec = function () {
            koModel.updateAll();
        };
    });

    CKEDITOR.replace('txtDescription');
    CKEDITOR.replace('txtAnalystDescription');
    CKEDITOR.replace('txtTesterDescription');
    for (var i in CKEDITOR.instances) {
        var ck = CKEDITOR.instances[i];
        ck.on('change', fnCkUpdate);
        ck.on('key', fnCkUpdate);
        ck.on('paste', function (e) {
            var files = (e.data.dataTransfer._ || e.data.dataTransfer._).files;
            var blob = null;
            for (var i = 0; i < files.length; i++) {
                if (files[i].type.indexOf("image") > -1) {
                    blob = files[i];
                }
            }
            if (blob !== null) {
                submitFile(blob, "paste", function () {
                    var imageUrl = [location.protocol, "//", location.host, koModel.addedFiles.last().url()];
                    e.editor.insertHtml("<img alt='' " +
                    "src='" + imageUrl.join("") + "' />");
                });
            }
        });
    }

    window.setSize = function () {
        var h = $(window).height();
        var div = $(".right-content, .left-menu");
        div.each(function () { $(this).css({ height: h - 42 - $(this).offset().top + "px" }); });
    };

    setSize();
    $(window).resize(function () {
        setSize();
    });

});

function initModel(koModel, data) {
    var model = new ejs.model({
        sets:
        [{
            name: "projectTasks",
            properties: ["comments", "completed", "employeeID", "dateBegin", "typeID", "dateEnd", "createDate", "name", "dateEndPlan", "projectID", "orderNumber", "responsibleID", "employeeName", "statusText", "statusID", "message", "visibilityID", "version",
            "previousID", "previousName", "newMessage", "overdue", "projectName", "projectType", "responsibleName", "description", "turnID", "priorityID", "creator", "price", "invoiceID", "invoiceNumber", "term", "analystDescription", "testerDescription",
            "deleted"],
            belongs: ["project", { name: "responsible", setName: "users" }, { name: "status", setName: "statbooks" }, { name: "type", setName: "taskTypes" }, { name: "turn", setName: "statbooks" }, { name: "priority", setName: "statbooks" }],
            hasMany: [{ name: "messages", setName: "projectTaskMessages", fkProperty: "taskID" }, { name: "files", setName: "projectFiles" }]
        }, {
            name: "taskTypes",
            properties: ["comments", "deleted", "name", "shortName", "customerID", "orderNumber", "code", "sysName", "price", "customerName", "duration"]
        }, {
            name: "users",
            properties: ["fullName", "managerFee", "roleID", "deleted", "blocked"]
        }, {
            name: "projects",
            properties: ["fullName", "deleted", "parentName", "parentID", "responsibleID", "responsibleName", "contractorID", "name", "employeeID", "employeeName"]
        }, {
            name: "projectTaskMessages",
            properties: ["text", "taskID", "creatorName", "createDate", "creator", "notify"],
            hasMany: [{ name: "files", setName: "projectFiles" }]
        }, {
            name: "projectFiles",
            properties: ["fileID", "projectID", "typeID", "categoryID", "projectTaskID", "fileName", "size", "url", "projectTaskMessageID"]
        }, {
            name: "employees",
            properties: ["surname", "name", "patronymic", "deleted", "walletID", "walletName", "fullName"]
        }, {
            name: "refbooks",
            properties: ["comments", "name", "deleted", "orderNumber", "typeID"],
            hasMany: [{ name: "stages", setName: "workStages", fkProperty: "categoryID" }]
        }, {
            name: "statbooks",
            properties: ["comments", "name", "orderNumber", "typeID", "color"]
        }, {
            name: "invoices",
            properties: ["date", "drawnDate", "projectID", "amount", "nulled", "number", "comments", "leftAmount"]
        }]
    });

    model.events.koCreated.attach(function (e) {
        if (e.className == "project") {

        } else if (e.className == "projectTask") {
            e.ko.include(["responsible", "messages", "files", "status", "project", "type", "turn", "priority"]);
            e.ko.actualFiles = ko.cmp(function () {
                return e.ko.files().where('val=>!val.projectTaskMessageID()');
            });
            e.ko.dateBegin.subscribe(function (value) {
                koModel.fillDateEnd(e.ko);
            });
            e.ko.typeID.subscribe(function (value) {
                koModel.fillDateEnd(e.ko);
            });
            e.ko.statusName = ko.cmp(function () {
                return e.ko.status() ? e.ko.status().name() : "";
            });
            e.ko.priorityName = ko.cmp(function () {
                return e.ko.priority() ? e.ko.priority().name() : "";
            });
            e.ko.turnName = ko.cmp(function () {
                return e.ko.turn() ? e.ko.turn().name() : "";
            });

            e.ko.projectID.subscribe(function (value) {
                if (!e.ko.project() || e.entity.inParse)
                    return;
                var p = e.ko.project();
                e.ko.responsibleID(p.responsibleID());
                e.ko.responsibleName(p.responsibleName());

                if (p.employeeID()) {
                    e.ko.employeeID(p.employeeID());
                    e.ko.employeeName(p.employeeName());
                }
            });
        } else if (e.className == "projectTaskMessage") {
            e.ko.include(["files"]);
        }
    });
    model.events.updated.attach(function (e) {
        if (koModel.canceling)
            return;
        if (e.errors && e.errors.any()) {
            var errors = "";
            for (var i = 0; i < e.errors.length; i++) {
                var r = e.errors[i];
                var err = (koModel.strings ? koModel.strings[r] : r) || r; //toJsObject(eval("(" + r + ")"));
                errors += err ? err + "<br/>" : "";
            }
            ejs.alert("Не удается сохранить изменения!", "Не удается сохранить изменения!<br/>Список ошибок:<br/>" + errors);
            return;
        }

        if (e.model.hasChanges())
            return;

        window.showTip("Изменения сохранены");
        koModel.addedFiles = [];
        //if (koModel.nextTask()) {
        //    koModel.createProjectTask();
        //} else if (koModel.needRefresh) {
        //    koModel.projectTasksPager.refresh();
        //}
    });

    koModel.taskStatuses = function () {
        return koModel.statbooks().where("val=>val.typeID()==" + host.statbooks.taskStatuses);
    };
    koModel.taskPriorities = function () {
        return koModel.statbooks().where("val=>val.typeID()==" + host.statbooks.taskPriorities);
    };
    koModel.taskTurns = function () {
        return koModel.statbooks().where("val=>val.typeID()==" + host.statbooks.taskTurns);
    };
    koModel.taskVisibilities = function () {
        return koModel.statbooks().where("val=>val.typeID()==" + host.statbooks.taskVisibilities);
    };

    koModel.fillDateEnd = function (row) {
        if (!row.dateBegin() || row.entity.inParse || row.dateEnd() || !row.type() || ejs.isEmpty(row.type().duration()))
            return;
        var duration = row.type().duration();
        try {
            var date = $.datepicker.parseDate($.datepicker._defaults.dateFormat, row.dateBegin());
            date.setDate(date.getDate() + duration);
            row.dateEndPlan(date.toSds());
        } catch (ex)
        { }
    };

    return model;
};

function getUploaderUrl() {
    var t = koModel.task();
    return host.arp + 'Data/UploadToTask?ProjectID=' + t.projectID() + "&TaskID=" + t.id() + "&TaskName=" + encodeURI(t.name());
};

function initUploader(koModel, model, data) {
    var t = koModel.task();
    var resetFn = function () {
        koModel.uploader.settings.url = getUploaderUrl();
    };
    t.id.subscribe(resetFn);
    t.projectID.subscribe(resetFn);
    t.name.subscribe(resetFn);

    var uploaderInitHtml = null;
    var uploader = koModel.uploader = new plupload.Uploader({
        runtimes: 'html5,gears,flash,silverlight,browserplus',
        browse_button: 'btnAddFile',
        drop_element: 'divDropZone',
        max_file_size: '50mb',
        url: getUploaderUrl(),
        flash_swf_url: host.arp + 'Scripts/Plupload/Moxie.swf',
        silverlight_xap_url: host.arp + 'Scripts/Plupload/Moxie.xap'
    });

    uploader.init();

    uploader.bind('FilesAdded', function (up, files) {
        var drop = $("#divDropZone").is(":visible");
        $("#divDropZone").hide();
        document.ondragleave.busy = false;

        if (drop) {
            koModel.filesSender("btnAddFile");
        }

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
        var t = koModel.task();
        if (!t.projectID() || !t.name()) {
            e.cancel = true;
            window.showTip("Укажите проект и тему задачи перед загрузкой файлов!", "", "error");
            return;
        }
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
            var result = model.projectFiles.addData([e.projectFile]);
            result.newEntities.forEach(function (it) {
                it = it.toKo();
                it.projectTaskID(koModel.task().id());
                koModel.addedFiles.push(it);
                var btn = koModel.filesSender(); //uploader.settings.browse_button[0].id;
                if (btn == "btnAddCommentFile" || $("#txtMessage").is(":focus")) {
                    it.projectTaskMessageID(-1);
                    koModel.newMessageFiles.push(it);
                } else if (btn.startsWith("btnAddCommentFile_")) {
                    var id = btn.split("_").last();
                    var mess = koModel.projectTaskMessages().first("val=>val.id()=='" + id + "'");
                    if (mess) {
                        it.projectTaskMessageID(mess.id());
                    }
                }
            });

        } else if (e.message == "Incorrect size") {
            alertSize();
        } else {
            ejs.alert(e.message, e.message);
        }
    });

    var alertSize = function () {
        ejs.alert("Файл слишком большой", "Вы не можете загружать изображения более " + Math.floor(koModel.maxPictureSize / 1024 / 1024) + " МБ!");
    };

    $('.add-file').mouseenter(function () {
        var id = $(this).attr('id');
        uploader.setOption("browse_button", id);
        koModel.filesSender(id);
        //uploader.settings.browse_button = $(this).attr('id');
        //uploader.refresh();
    });

    document.ondragenter = function (e) {
        if (document.ondragleave.t) {
            clearTimeout(document.ondragleave.t);
            document.ondragleave.t = null;
        }

        //uploader.setOption("browse_button", "btnAddFile");
        $("#divDropZone").show();
    };

    document.ondragleave = function (e) {
        if (document.ondragleave.t || e.target.id != "divDropZone")
            return;
        document.ondragleave.t = setTimeout(function () {
            $("#divFiles .dropzone").hide();
        }, 50);
    };

    if (typeof document.onpaste != "undefined") {
        document.onpaste = function (event) {
            // use event.originalEvent.clipboard for newer chrome versions
            var items = (event.clipboardData || event.originalEvent.clipboardData).items;
            // find pasted image among pasted items
            var blob = null;
            for (var i = 0; i < items.length; i++) {
                if (items[i].type.indexOf("image") > -1 || items[i].kind.indexOf("file") > -1) {
                    blob = items[i].getAsFile();
                }
            }
            // load image if there is a pasted image
            if (blob !== null) {
                submitFile(blob, "paste");
            }
        }
    }
};

function submitFile(file, type, callback) {
    if (typeof FormData == "undefined")
        return;

    var extension = file.type.match(/\/([a-z0-9]+)/i)[1].toLowerCase();
    var formData = new FormData();
    formData.append('file', file, "image_file");
    formData.append('extension', extension);
    formData.append("mimetype", file.type);
    formData.append('submission-type', type);

    $.ajax({
        url: getUploaderUrl(),
        type: 'POST',
        data: formData,
        contentType: false,
        processData: false,
        success: function (data) {
            var e = ejs.toJsObject(data);
            koModel.onFileUploaded.raise(e);
            ejs.cif(callback);
        },
        error: function () {
            ejs.alert("Непредвиденная ошибка!", "Непредвиденная ошибка!");
        }
    });
}