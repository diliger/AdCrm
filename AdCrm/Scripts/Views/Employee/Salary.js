var koModel = {
    filter: {
        year: ko.obs(""),
        month: ko.obs(""),
        project: ko.obs("")
    },
    itabs: ko.obsa([{
        id: 1,
        name: "расходы",
        url: host.arp + "Employee/Index/{0}"
    }, {
        id: 2,
        name: "подотчетные деньги",
        url: host.arp + "Employee/Index/{0}"
    }, {
        id: 3,
        name: "передача денег",
        url: host.arp + "Employee/Index/{0}"
    //}, {
    //    id: 4,
    //    name: "стоимость расходов",
    //    url: host.arp + "Employee/Index/{0}"
    }, {
        id: 5,
        frmID: "frmTasks",
        name: "задачи",
        url: host.arp + "Employee/Tasks/{0}",
    }, {
        id: 5,
        frmID: "frmSalary",
        name: "зарплата",
        selected: true,
        url: "#"
    }]),
    years: ko.obsa([]),
    salaryRows: ko.obsa([]),
    selectedArray: ko.obsa([]),
    selectedTotalPayroll: ko.cmp(function () { return 0; }),
    selectedTotalExpense: ko.cmp(function () { return 0; }),
    grid: $.fn.koGrid.getSaveSettingsObject(host.p + "#tblSalary", "tblSalary"),
    hideThePage: ko.obs(false)
};

$(function () {
    var data = eval("(" + $("#scrData").html().trim() + ")");
    data = toJsObject(data);
    var model = initModel(koModel, data);

    koModel.employeeID = data.employee.id;
    model.refreshData(data);
    model.employees.addData([data.employee]);
    model.toKo(koModel);
    koModel.employee = koModel.employees().first();
    koModel.monthes = ko.obsa($.datepicker.regional['ru'].monthNames.select(function (it, i) {
        var result = {
            id: i + 1,
            name: it
        };

        return result;
    }));
    koModel.monthes.push({ id: null, name: "Все..." });

    koModel.filter.year(data.year);
    koModel.filter.month(data.month);
    koModel.years(data.years);
    
    koModel.filter.month.subscribe(function () {
        koModel.refresh();
    });
    koModel.filter.year.subscribe(function () {
        koModel.refresh();
    });

    koModel.itabs().forEach(function (it) {
        it.url = it.url.replace("{0}", koModel.employeeID);
    });

    koModel.refresh = function () {
        ejs.busy("Refresh");
        koModel.selectedArray([]);
        $.rjson({
            url: host.arp + "Employee/SalaryJson/" + koModel.employee.id(),
            data: { month: koModel.filter.month(), year: koModel.filter.year() },
            success: function (result) {
                ejs.free("Refresh");
                //result.Rows = result.Rows.orderBy("val=>val.Date");
                result = toJsObject(result);

                koModel.salaryRows(result.rows);
            }
        });
    };

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

        top.busy("UpdateEmployee");

        model.update(function (result) {
            top.free("UpdateEmployee");
            var changes = result.changes.updated.any() || result.changes.deleted.any();
            if (showQtip == false || result.canceled.any()) {
            } else if (showQtip == true || changes) {
                window.showTip("Данные успешно сохранены");
            }

            if (typeof callback == "function") {
                callback(result);
            }
        });
        return true;
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
    };

    initSalary(koModel, model, data);

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
            name: "employees",
            properties: data.employeeProperties.select("val=>ejs.toJsName(val)"),
            belongs: [{ name: "position" }, { name: "department" }]
        }, {
            name: "departments",
            properties: ["comments", "name", "deleted", "orderNumber"],
            hasMany: [{ name: "employees" }, { name: "positions" }]
        }, {
            name: "positions",
            properties: ["comments", "name", "deleted", "departmentID", "orderNumber"],
            hasMany: [{ name: "employees" }]
        }]
    });

    model.events.koCreated.attach(function (e) {
        if (e.className == "employee") {
            e.ko.include(["position", "department"]);
            //ko.toDobs(e.ko.lastSalary);
            //e.ko.balance = ko.obs(e.ko.balance());
            e.ko.fullName = ko.cmp({
                read: function () { return [e.ko.surname(), e.ko.name(), e.ko.patronymic()].join(" ").trim(); },
                write: function (value) {
                    var parts = value.split(" ");
                    if (parts.length == 1) {
                        e.ko.name(parts[0]);
                        e.ko.surname("");
                    } else {
                        e.ko.surname(parts[0]);
                        e.ko.name(parts[1]);
                    }
                    e.ko.patronymic(parts[2]);
                }
            });

            e.ko.archived.subscribe(function (newValue) {
                if (newValue) {
                    e.ko.archiveDate((new Date()).toSds());
                } else {
                    e.ko.archiveDate("");
                }
            });
            e.ko.archiveDate.subscribe(function (newValue) {
                if (newValue) {
                    e.ko.archived(true);
                } else {
                    e.ko.archived(false);
                }
            });

            e.ko.disabled = ko.cmp(function () {
                return e.ko.archived() && (isEmpty(e.ko.archiveDate()) || parseDate(e.ko.archiveDate()) <= new Date())
            });
        }
    });

    return model;
};

function initSalary(koModel, model, data) {

    var gridSettings = data.settings.first("val=>val.name=='" + koModel.grid.name + "'");
    if (gridSettings) {
        gridSettings = eval("(" + gridSettings.value + ")");
    }

    $("#tblSalary").koGrid({
        koTemplateID: "trSalary",
        headerContainer: $("#divSalaryHeader"),
        styleID: "stlSalaryGrid",
        tableID: "tblSalary",
        columns: gridSettings || [],
        sortable: true,
        //sortMethod: koModel.pager.order,
        disallowSort: ["Save", "Select"]
    });

    koModel.refresh();
};