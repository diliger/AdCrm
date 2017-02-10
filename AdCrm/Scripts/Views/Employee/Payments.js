var context = {
    defer: true,
    payment: { selectedArray: ko.obsa([]) },
    filter: { dateFrom: null, dateTo: null, employeeID: ko.obs("") },
    grid: $.fn.koGrid.getSaveSettingsObject(host.p + "#tblPayments", "tblPayments"),
    mainKo: window.koModel
};
$(function () {
    window.koModel.paymentsKoModel = context;

    var koModel = context;
    var data = eval("(" + $("#scrPaymentsPartialData").text() + ")");
    var model = koModel.mainKo.getModel();
    data = toJsObject(data);

    koModel.employees = koModel.mainKo.employees;
    koModel.employeePayments = koModel.mainKo.employeePayments;

    model.events.koCreated.attach(function (e) {
        if (e.className == "employeePayment") {
            ko.toDobs(e.ko.amount);

            if (e.ko.id() < 0) {
                e.ko.employeeID(koModel.filter.employeeID());
                if (koModel.filter.dateFrom && koModel.filter.dateFrom()) {
                    e.ko.date(koModel.filter.dateFrom());
                } else {
                    e.ko.date((new Date()).toSds());
                }
            }
        }
    });
    model.addData(data);

    koModel.pager = new ejs.remotePager({
        set: model.employeePayments,
        model: model,
        //pageSize: 20,
        compressPages: true,
        filters: [{
            property: "date",
            value: function () { return typeof koModel.filter.dateFrom == "function" ? koModel.filter.dateFrom() : koModel.filter.dateFrom; },
            type: "date",
            condition: ">="
        }, {
            property: "date",
            value: function () { return typeof koModel.filter.dateTo == "function" ? koModel.filter.dateTo() : koModel.filter.dateTo; },
            type: "date",
            condition: "<="
        }, {
            property: "employeeID",
            value: koModel.filter.employeeID,
            type: "number",
            condition: "=="
        }]
    });

    koModel.pager.events.pageChanging.attach(function (e) {
        e.cancel = koModel.defer;
    });

    koModel.pager.loading.subscribe(function (value) {
        if (value) {
            top.busy("pager");
        } else {
            top.free("pager");
        }
    });

    koModel.refresh = function () {
        koModel.defer = false;
        koModel.payment.selectedArray([]);
        koModel.pager.goTo(0);
    };

    koModel.payment.selectedTotal = ko.cmp(function () {
        var payments = koModel.payment.selectedArray().select(function (it) { return koModel.employeePayments().first("val=>val.id()==" + it); });
        return payments.sum("val=>val.amount()");
    });

    koModel.payment.create = function () {
        model.employeePayments.create();
    };

    koModel.payment.remove = function (row) {
        var message = ["Вы действительно хотите удалить запись ", row.date(), " (" + row.amount.text() + ")", "?"].join("");

        if (row.id() > 0 && !confirm(message)) {
            return;
        }

        koModel.payment.selectedArray([]);

        row.entity.remove();
        koModel.mainKo.updateAll();
    };

    //koModel.toExcel = function () {
    //    var expenses = koModel.expenses();
    //    if (koModel.expense.selectedArray().any()) {
    //        expenses = koModel.expense.selectedArray().select(function (it) { return expenses.first("val=>val.id()==" + it); });;
    //    }
    //    var headers = ["Дата", "Объект", "Сотрудник", "Ед. Измерения", "Кол-во", "Цена", "Тип", "Название", "Вид оплаты (нал/безнал)", "Сумма", "Примечание"];

    //    var name = ["Расходы_", koModel.filter.year(), "_", koModel.filter.month()].join("");
    //    var rows = expenses.select(function (it) {
    //        return [it.date(), it.projectName(), it.employeeName(), it.type().unitName(), it.count(), it.price(), it.type().name(), it.name(), it.paymentType().name(), it.sum()];
    //    });
    //    $.rjson({
    //        url: ApplicationRootPath + "Data/ToExcel", data: { Name: name, Headers: headers, Rows: rows }, success: function (result) {
    //            if (result.Success) {
    //                window.location = result.Url;
    //            }
    //        }
    //    });
    //};

    //koModel.loadEmployees = function (request, callback, row) {
    //    var name = row.employeeName().toLowerCase();

    //    var filter = request ? request.term : "";
    //    filter = filter ? filter.toLowerCase() : "";
    //    filter = filter == name ? "" : filter;

    //    var items = koModel.employees().where("val=>!val.deleted()||val.id()=='" + row.employeeID() + "'");
    //    if (filter.length <= 2 && items.where("val=>val.fullName().contains('" + filter + "',1)").length > 10) {

    //        var items = items.where("val=>val.fullName().contains('" + filter + "',1)").orderBy("val=>val.fullName().toLowerCase()").select(function (item) {
    //            return { label: item.fullName(), value: item.fullName(), source: item };
    //        });

    //        if (typeof callback == "function") {
    //            callback(items);
    //        } else {
    //            return items;
    //        }
    //    } else {
    //        var where = [];

    //        var w = ejs.cwp("group", false, "==", "group");
    //        w.SubParameters = [ejs.cwp("deleted", false, "==", "bool")];
    //        if (row.employeeID() > 0) {
    //            w.SubParameters.push(ejs.cwp("id", row.employeeID(), "==", "number", "or"));
    //        }
    //        where.push(w);

    //        if (filter) {
    //            var w = ejs.cwp("group", "%" + filter + "%", "like", "group");
    //            w.SubParameters = [ejs.cwp("name", "%" + filter + "%", "like", "string", "or"), ejs.cwp("surname", "%" + filter + "%", "like", "string", "or"), ejs.cwp("patronymic", "%" + filter + "%", "like", "string", "or")];
    //            where.push(w);
    //        }

    //        model.employees.select(function (collection, result) {
    //            var items = result.allEntities.select(function (item) { return { label: item.toKo().fullName(), value: item.toKo().fullName(), source: item }; });

    //            if (typeof callback == "function") {
    //                callback(items.orderBy("val=>val.label.toLowerCase()"));
    //            } else {
    //                return items;
    //            }
    //        }, where, "", 20);
    //    }
    //};

    //koModel.openAutocomplete = function (data, e) {
    //    var div = $(e.target).parent();

    //    div.find("input").focus().trigger('keydown.autocomplete')
    //    div.find("input").autocomplete("search")
    //};

    var gridSettings = data.settings.first("val=>val.name=='" + koModel.grid.name + "'");
    if (gridSettings) {
        gridSettings = eval("(" + gridSettings.value + ")");
    }

    $("#tblPayments").koGrid({
        koTemplateID: "trPayment",
        headerContainer: $("#divPaymentsHeader"),
        styleID: "stlPaymentsGrid",
        tableID: "tblPayments",
        columns: gridSettings || [],
        sortable: true,
        sortMethod: koModel.pager.order,
        disallowSort: ["Save", "Select", "Index"]
    });

    ko.apply(koModel, $("#divPaymentsPartial").get(0));
});