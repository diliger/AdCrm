var koModel = {
    filter: {
        text: ko.obs("")
    },
    department: {
        //inserted: ko.obs(null),
        //selected: ko.obs(null),
        selectedArray: ko.obsa([]),
        positions: ko.obsa([])
    },
    position: {
        selectedArray: ko.obsa([])
    },
    grid: {
        departments: {
            name: "/Manager/Departments#tblDepartments",
            save: function () {
                var value = $("#tblDepartments").koGrid("getColumns");
                var name = koModel.grid.departments.name;

                koModel.grid.departments.inProgress(true);
                saveSetting(name, value, function () {
                    koModel.grid.departments.inProgress(false);
                });
            },
            inProgress: ko.obs(false)
        }, positions: {
            name: "/Manager/Departments#tblPositions",
            save: function () {
                var value = $("#tblPositions").koGrid("getColumns");
                var name = koModel.grid.positions.name;

                koModel.grid.positions.inProgress(true);
                saveSetting(name, value, function () {
                    koModel.grid.positions.inProgress(false);
                });
            },
            inProgress: ko.obs(false)
        }
    },
    hideThePage: ko.obs(false)
};

$(function () {
    var data = eval("(" + $("#scrData").text() + ")");
    var model = new ejs.model({
        sets:
        [{
            name: "departments",
            properties: ["comments", "name", "managerID", "orderNumber", "deleted"],
            belongs: [{ name: "manager", setName: "users"}],
            hasMany: [{ name: "positions"}]
        }, {
            name: "users",
            properties: ["surname", "name", "patronymic", "deleted", "blocked"]
        }, {
            name: "positions",
            properties: ["comments", "name", "deleted", "departmentID", "orderNumber"],
            belongs: [{ name: "department"}]
        }]
    });

    data = toJsObject(data);

    model.events.koCreated.attach(function (e) {
        if (e.className == "department") {
            e.ko.include(["positions", "manager"]);

            if (e.ko.id() < 0) {
                var user = koModel.users().first("val=>!val.deleted()&&!val.blocked()");
                e.ko.managerID(user ? user.id() : "");
            }

            e.ko.flname = ko.cmp(function () {
                return z.filter.markMatches(e.ko.name(), koModel.filter.text());
            });
        } else if (e.className == "position") {
            e.ko.include("department");
            if (e.ko.id() < 0) {
                e.ko.departmentID(koModel.department.selected().id());
            }
        } else if (e.className == "user") {
            e.ko.fullName = ko.cmp(function () { return [e.ko.surname(), e.ko.name(), e.ko.patronymic()].join(" ").trim(); });
        }
    });

    model.refreshData(data);
    model.toKo(koModel);
    koModel.department.selected = ko.cmp(function () {
        var id = koModel.department.selectedArray().first();
        return koModel.departments().first("val=>val.id()=='" + id + "'");
    });
    koModel.department.selected.subscribe(function (newValue) {
        koModel.department.refreshPositions();
    });
    koModel.department.refreshPositions = function () {
        koModel.department.positions(koModel.department.selected() ? koModel.department.selected().positions().where("val=>!val.deleted()") : []);
    };
    koModel.positions.subscribe(function (newValue) {
        koModel.department.refreshPositions();
    });

    koModel.pager = new ejs.remotePager({
        set: model.departments,
        model: model,
        //pageSize: 20,
        compressPages: true,
        filters: [{
            property: "deleted",
            value: false,
            type: "bool"
        }, {
            value: function () { return isEmpty(koModel.filter.text()) ? "" : "%" + koModel.filter.text() + "%"; },
            condition: "like", type: "group", property: "group",
            filters: [{ property: "name", type: "string", operand: "or" }, { property: "comments", type: "string", operand: "or"}]
        }],
        includes: [ejs.createIncludeParameter(model.positions, true)]
    });

    koModel.pager.loading.subscribe(function (value) {
        if (value) {
            top.busy("pager");
        } else {
            top.free("pager");
        }
    });

    koModel.activeManagers = function (row) {
        return koModel.users().where(function (it) { return (!it.deleted() && !it.blocked()) || it.id() == row.managerID(); });
    };

    koModel.updateAll = function (callback) {
        var valid = true;
        $("#divRightContent form").each(function () {
            valid = valid & $(this).valid();
        });
        if (!valid)
            return false;

        top.busy("UpdateDepartments");
        model.update(function () {
            top.free("UpdateDepartments");
            if (typeof callback == "function") {
                callback();
            }
        });
        return true;
    };

    koModel.filter.text.subscribe(function () {
        koModel.pager.goTo(0);
    });

    koModel.loadAll = function () {
        koModel.pager.setting.pageSize = -1;
        koModel.pager.refresh();
    };

    koModel.refresh = function () {
        koModel.pager.goTo(0);
    };

    koModel.department.select = function (row) {
        if (koModel.department.selectedArray().length > 1) {
            return;
        }
        koModel.department.selectedArray([]);
        koModel.department.selectedArray.push(row.id().toString());
    };

    koModel.department.create = function () {
        var department = model.departments.create();
        koModel.department.select(department.toKo());
    };

    koModel.department.remove = function (department) {
        var departments = [];
        if (department.entity) {
            koModel.department.selectedArray([]);
            departments.push(department);
        } else {
            if (koModel.position.selectedArray().any()) {
                koModel.position.remove({});
                return;
            }
            departments = koModel.department.selectedArray().select(function (it) { return koModel.departments().first("val=>val.id()==" + it); });
        }

        if (!departments.any()) {
            koModel.position.remove({});
        }

        var names = ["отдел", "отдела", "отделов"];
        var message = ["Вы действительно хотите удалить ",
                       departments.length == 1 ? names[0] + " " + departments[0].name() : departments.length + " " + i18n.declineCount(departments.length, names[0], names[1], names[2]),
                       "?"].join("");

        if (departments.length == 0 || (departments.any("val=>val.id()>0") && !confirm(message))) {
            return;
        }
        departments.forEach(function (it) {
            if (it.id() > 0) {
                it.deleted(true);
            } else {
                it.entity.remove();
            }
        });
        koModel.updateAll(function () {
            departments.forEach(function (it) {
                it.entity.detach();
            });
            koModel.department.selectedArray([]);
            //koModel.department.selected(null);
        });
    };

    koModel.position.create = function () {
        if (!koModel.department.selected()) {
            alert("Выберите отдел!");
            return;
        }
        var position = model.positions.create();
        position.departmentID(koModel.department.selected().id());
        koModel.department.refreshPositions();
    };

    koModel.position.remove = function (position) {
        var positions = [];
        if (position.entity) {
            koModel.position.selectedArray([]);
            positions.push(position);
        } else {
            positions = koModel.position.selectedArray().select(function (it) { return koModel.positions().first("val=>val.id()==" + it); });
        }

        var names = ["должность", "должности", "должностей"];
        var message = ["Вы действительно хотите удалить ",
                       positions.length == 1 ? names[0] + " " + positions[0].name() : positions.length + " " + i18n.declineCount(positions.length, names[0], names[1], names[2]),
                       "?"].join("");

        if (positions.length == 0 || (positions.any("val=>val.id()>0") && !confirm(message))) {
            return;
        }
        positions.forEach(function (it) {
            if (!it.name()) {
                it.name("deleted");
            }

            if (it.id() > 0) {
                it.deleted(true);
            } else {
                it.entity.remove();
            }
        });

        koModel.updateAll(function () {
            positions.forEach(function (it) {
                it.entity.detach();
            });
            koModel.position.selectedArray([]);
            koModel.department.refreshPositions();
        });
    };

    koModel.searchKeyPress = function (data, event) {
        if (event.keyCode == 13 || event.which == 13) {
            var element = $(event.target);
            setTimeout(function () {
                element.change();
                koModel.refresh();
            }, 100);
        }
        return true;
    };

    koModel.toExcel = function () {
        var departments = koModel.departments();
        if (koModel.department.selectedArray().any()) {
            departments = koModel.department.selectedArray().select(function (it) { return departments.first("val=>val.id()==" + it); }); ;
        }
        var headers = ["Отдел", "Номер", "Руководитель", "Должность"];

        var name = ["Отделы_", (new Date()).toSds()].join("");
        var rows = [];
        departments.forEach(function (it) {//.orderBy("val=>val.orderNumber()")
            var positions = it.positions().where("val=>!val.deleted()").orderBy("val=>val.orderNumber()");
            var position = positions.first();
            rows.push([it.name(), it.orderNumber(), it.manager().fullName(), position ? position.name() : ""]);
            for (var i = 1; i < positions.length; i++) {
                position = positions[i];
                rows.push(["", "", "", position.name()]);
            }
        });
        $.rjson({ url: ApplicationRootPath + "Data/ToExcel", data: { Name: name, Headers: headers, Rows: rows }, success: function (result) {
            if (result.Success) {
                window.location = result.Url;
            }
        }
        });
    };

    var gridSettings = data.settings.first("val=>val.name=='" + koModel.grid.departments.name + "'");
    if (gridSettings) {
        gridSettings = eval("(" + gridSettings.value + ")");
    }

    $("#tblDepartments").koGrid({
        koTemplateID: "trDepartment",
        headerContainer: $("#divDepartmentsHeader"),
        styleID: "stlDepartmentsGrid",
        tableID: "tblDepartments",
        columns: gridSettings || [],
        sortable: true,
        sortMethod: koModel.pager.order,
        //source: koModel.project.rows,
        disallowSort: ["Save", "Select"]
    });

    gridSettings = data.settings.first("val=>val.name=='" + koModel.grid.positions.name + "'");
    if (gridSettings) {
        gridSettings = eval("(" + gridSettings.value + ")");
    }

    var grid = $("#tblPositions").koGrid({
        koTemplateID: "trPosition",
        headerContainer: $("#divPositionsHeader"),
        styleID: "stlPositionsGrid",
        tableID: "tblPositions",
        columns: gridSettings || [],
        sortable: true,
        source: koModel.department.positions,
        disallowSort: ["Save", "Select"]
    });
    koModel.grid.positions.sorted = grid.sorted;

    $("#divRightContent form").validate({
        errorClass: "invalid",
        errorPlacement: errorPlacement
    });

    ko.apply(koModel);

    koModel.pager.goTo(0);
});
