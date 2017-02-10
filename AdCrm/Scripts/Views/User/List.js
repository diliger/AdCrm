var koModel = {
    user: {
        selected: ko.obs(null)
    },
    grid: $.fn.koGrid.getSaveSettingsObject("/User/List#tblUsers", "tblUsers"),
    hideThePage: ko.obs(false),
    currentAction: ko.obs("")
};

koModel.validate = function (user, callback) {
    var val = $("#divUser form").valid();
    var req = "Поле обязательно для заполнения";
    var exists = "Пользователь с таким логином уже существует";
    user.loginError("");

    if (!val)
        return false;

    if (val && user.id() < 0) {
        var options = {
            url: ApplicationRootPath + "User/CheckLogin",
            data: { Login: user.login() },
            success: function (args) {
                val = args.Result;
                if (args.Result == false) {
                    user.loginError(exists);
                }
                if (typeof callback == "function") {
                    callback(val);
                }
            },
            error: function (err) { alert("Error"); }
        }
        $.rjson(options);
    } else if (typeof callback == "function") {
        callback(val);
    } else {
        return val;
    }
};

koModel.cancel = function () {
    var user = koModel.user.selected();
    user.loginError("");
    $("#divUser").dialog("close");
    if (user.entity.id() < 0) {
        user.entity.remove();
    } else if (user.entity.hasChanges) {
        user.entity.restore();
    }
    koModel.user.selected(null);
};

$(function () {
    var data = eval("(" + $("#scrData").text() + ")");

    data = toJsObject(data);
    var model = new ejs.model({
        sets: [{
            name: "users",
            className: "user",
            properties: ["id", "login", "email", "phone", "password", "fullName", "roleID", "blocked", "deleted", "contractorID", "contractorName"],
            belongs: [{ name: "role", setName: "roles", fkProperty: "roleID" }]
        }, {
            name: "roles",
            className: "role",
            properties: ["id", "name", "deleted"],
            hasMany: [{ name: "users", setName: "users", fkProperty: "roleID" }]
        }, {
            name:"contractors",
            properties:["name"]
        }]
    });

    model.events.koCreated.attach(function (e) {
        if (e.className == "user") {
            e.ko.include("role");
            e.ko.loginError = ko.obs("");
            e.ko.roleName = ko.cmp(function () { return e.ko.role() ? e.ko.role().name() : ""; });
        }
    });

    koModel.activeRoles = function (id) {
        return koModel.roles().where("val=>val.id()=='" + id + "'||!val.deleted()");
    };

    model.refreshData(data);
    model.toKo(koModel);

    koModel.loadContractors = function (request, callback, row) {
        var name = row.contractorName().toLowerCase();

        var filter = request ? request.term : "";
        filter = filter ? filter.toLowerCase() : "";
        filter = filter == name ? "" : filter;

        var where = [ejs.cwp("deleted", false, "=", "bool")];
        if (filter) {
            var w = ejs.cwp("name", "%" + filter + "%", "like");
            where.push(w);
        }

        model.select(ejs.cso(model.contractors, where, [ejs.cop("name")], 20), function (result) {
            model.addData(result.collections);
            callback(result.collections.contractors.select(function (it, i) {
                return { label: it.name, value: it.name, source: it };
            }));
        });
    };

    koModel.add = function () {
        var newUser = new model.user();
        newUser.id(model.getMinID());
        koModel.user.selected(newUser.toKo());
        koModel.currentAction("Добавление нового пользователя");
        $("#divUser").dialog("open");
    };

    koModel.edit = function (row) {
        koModel.user.selected(row);
        koModel.currentAction("Редактирование пользователя (" + row.login() + ")");
        row.entity.backup();
        $("#divUser").dialog("open");
    };

    koModel.remove = function (row) {
        if (row.id() == UserID) {
            z.alert("Вы не можете удалить пользователя, под которым вошли в систему в данный момент!");
            return;
        }
        if (!z.confirm("Вы точно хотите удалить пользователя \"" + row.login() + "\"?")) {
            return;
        }

        row.deleted(true);
        koModel.updateAll(function () {
            row.entity.detach();
        });
    };

    koModel.save = function () {
        var user = koModel.user.selected();
        koModel.validate(user, function (result) {
            if (!result)
                return;
            $("#divUser").dialog("close");
            user.entity.commit();
            if (user.id() < 0) {
                model.users.insert(user.entity);
            }
            koModel.updateAll();
        });
    };

    koModel.updateAll = function (callback) {
        top.busy("user");
        model.update(function () {
            top.free("user");
            if (typeof callback == "function") {
                callback();
            }
        });
    };

    var gridSettings = data.settings.first("val=>val.name=='" + koModel.grid.name + "'");
    if (gridSettings) {
        gridSettings = eval("(" + gridSettings.value + ")");
    }

    $("#tblUsers").koGrid({
        koTemplateID: "trUser",
        headerContainer: $("#divUsersHeader"),
        tableID: "tblUsers",
        sortable: true,
        columns: gridSettings || [],
        source: koModel.users,
        disallowSort: ["Save", "Select"]
    });

    $("#tblUsers tbody tr").dblclick(function (args) {
        var id = $(this).attr("id").split("_")[1];
        koModel.users().first("u=>u.id() == " + id).edit();
        return false;
    });

    $("#divUser").dialog({
        autoOpen: false,
        draggable: true,
        resizable: false,
        modal: true,
        width: 550,
        close: function () {
            koModel.user.selected(null);
        },
        open: function () {
            $("#divUser").dialog({ title: koModel.currentAction() });
        }
    });

    $("#divUser form").validate({
        errorClass: "invalid",
        errorPlacement: errorPlacement
    });

    ko.apply(koModel);
});