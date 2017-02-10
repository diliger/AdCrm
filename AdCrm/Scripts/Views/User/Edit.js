var koModel = {
    password: {
        previous: ko.obs(""),
        next: ko.obs(""),
        repeatNext: ko.obs("")
    },
    changePassword: function () {
        if (!$("#frmPassword").valid()) {
            return;
        }

        var data = {
            OldPassword: koModel.password.previous(),
            NewPassword: koModel.password.next()
        };

        var r = $.rjson({
            url: ApplicationRootPath + "User/ChangePassword",
            data: data,
            success: function (result) {
                free(r);

                if (result.code == 200) {
                    koModel.password.previous("");
                    koModel.password.next("");
                    koModel.password.repeatNext("");
                }

                alert(result.message);
            }
        });

        busy(r);
    }
};

$(function () {
    var data = eval("(" + $("#scrData").text() + ")");
    var model = new ejs.model({
        sets: [{
            name: "users",
            className: "user",
            properties: ["id", "login", "fullName", "email", "phone"]
        }]
    });

    data = toJsObject(data);
    model.users.addData([data.user]);

    var user = model.users.load().first();

    koModel.user = user.toKo();
    //koModel.user.fullName = ko.cmp({
    //    read: function () { return [koModel.user.surname(), koModel.user.name(), koModel.user.patronymic()].join(" ").trim(); },
    //    write: function (value) {
    //        var parts = value.split(" ");
    //        if (parts.length == 1) {
    //            koModel.user.name(parts[0]);
    //            koModel.user.surname("");
    //        } else {
    //            koModel.user.surname(parts[0]);
    //            koModel.user.name(parts[1]);
    //        }
    //        koModel.user.patronymic(parts[2]);
    //    }
    //});

    koModel.updateAll = function () {
        if (!$("#frmUser").valid()) {
            return false;
        }

        busy("i");
        user.commit();
        model.update(function () {
            free("i");
        });
        return true;
    };

    $("#divTabs").tabs({
        select: function (e, a) {
            if (a.index == 1) {
                return koModel.updateAll();
            }
        }
    });

    $("#frmUser").validate({
        errorClass: "invalid",
        errorPlacement: errorPlacement,
        messages: {
            Email: {
                required: "Введите Ваш email!",
                emal: "Email неправильного формата!"
            }
        }
    });

    $("#frmPassword").validate({
        errorClass: "invalid",
        errorPlacement: errorPlacement,
        messages: {
            OldPassword: {
                required: "Введите старый пароль!"
            },
            NewPassword: {
                required: "Введите новый пароль!"
            },
            RepeatNewPassword: {
                required: "Введите новый пароль еще раз!",
                equalTo: "Пароли не совпадают!"
            }
        }
    });

    ko.apply(koModel);
});