/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
 define(['N/search', 'N/crypto', 'N/runtime', 'N/record', 'N/file'], (search, crypto, runtime, record, file) => {
    const ACTION_TYPES = {
        'LOGIN': 'LOGIN',
        'TABLE': 'TABLE',
        'GRAPH': 'GRAPH'
    }

    const CSS_PLACEHOLDER = '<!--DYNAMIC CSS FILES-->';
    const LOGO_PLACEHOLDER = '<!--DYNAMIC PORTAL LOG-->';
    const onRequest = context => {
        const title = 'onRequest';
        const request = context.request;
        const response = context.response;
        try {
            const scriptParams = getScriptParams();
            // log.debug(scriptParams);
            if (request.method == 'GET') {

                log.debug({
                    title: title + 'Data',
                    details: request,
                })
                response.setHeader({
                    name: 'Content-Type',
                    value: 'text/html'
                });
                if (request.parameters.home) {
                    const dashboardFile = getPageContent(scriptParams.dashboardFileId);
                    const cssLinksArr = scriptParams.cssLinksStr.split('|');
                    const logoImageArr = scriptParams.logoPng.split('|');
                    const finalCSSTags = cssLinksArr.reduce((acc, curr) => {
                        return acc + `<link rel="stylesheet" href="${curr}">`
                    }, '');
                    log.debug(title + 'finalCSSTags', finalCSSTags);
                    const portalLogo = logoImageArr.reduce((acc, curr) => {
                        return acc + `<img src="${curr}">`
                    }, '');
                    log.debug(title + 'portalLogo', portalLogo);
                    let finalDashboardFile = dashboardFile.replace(CSS_PLACEHOLDER, finalCSSTags);
                    finalDashboardFile = finalDashboardFile.replace(LOGO_PLACEHOLDER, portalLogo);
                    response.write({
                        output: finalDashboardFile,
                    });

                } else {

                    const loginFile = getPageContent(scriptParams.loginFileId);
                    response.write({
                        output: loginFile,
                    });
                }

            } else if (request.method == 'POST') {
                response.setHeader({
                    name: 'Content-Type',
                    value: 'application/json',
                })
                const rawRequestBody = request.body;
                if (rawRequestBody) {
                    const requestBody = JSON.parse(rawRequestBody);
                    const actionType = requestBody.actionType;
                    log.debug({
                        title: title + 'requestBody',
                        details: requestBody
                    });
                    if (actionType) {
                        if (actionType == ACTION_TYPES.LOGIN) {
                            let customerEmail = requestBody.email;
                            let password = requestBody.password;
                            let loginResponse = loginCustomerWithEmailAndPassword(customerEmail, password);
                            if (loginResponse) {
                                response.write({
                                    output: JSON.stringify(loginResponse),
                                });
                                context.response.writePage(loginResponse);
                            }
                        }
                        if (actionType == ACTION_TYPES.TABLE) {
                            let customerResponedId = requestBody.customerId;
                            let customerToken = requestBody.token;
                            let displayingTableResponse = displayTable(customerResponedId, customerToken);
                            log.debug({
                                title: title + 'displayingTableResponse',
                                details: displayingTableResponse,
                            });
                            if (displayingTableResponse) {
                                response.write({
                                    output: JSON.stringify(displayingTableResponse),
                                });
                                context.response.writePage(displayingTableResponse);
                            }
                        }
                        if (actionType == ACTION_TYPES.GRAPH) {
                            let customerResponedId = requestBody.customerId;
                            let customerToken = requestBody.token;
                            let displayingGraphResponse = displayGraph(customerResponedId, customerToken);
                            log.debug({
                                title: title + 'displayingGraphResponse',
                                details: displayingGraphResponse,
                            });
                            if (displayingGraphResponse) {
                                response.write({
                                    output: JSON.stringify(displayingGraphResponse)
                                });
                                context.response.writePage(displayingGraphResponse);
                            }
                        }
                    }

                }

            }
        } catch (error) {
            log.error({
                title: title + 'Error',
                details: error,
            });
        }

    }
    const loginCustomerWithEmailAndPassword = (email, password) => {
        const title = 'loginCustomerWithEmailAndPassword :: ';
        try {
            let mySearch = search.create({
                type: search.Type.CUSTOMER,
                columns: [
                    search.createColumn({
                        name: 'internalid',
                    })
                ],
                filters: [
                    search.createFilter({
                        name: 'email',
                        operator: search.Operator.IS,
                        values: email,
                    })
                ],
            });
            let myResultSet = mySearch.run();
            let resultRange = myResultSet.getRange({
                start: 0,
                end: 1
            });
            log.debug({
                title: title + 'Length',
                details: resultRange.length,
            });
            if (resultRange.length > 0) {
                let customerId = resultRange[0].getValue('internalid');
                if (customerId) {
                    const options = {
                        recordType: record.Type.CUSTOMER,
                        recordId: +customerId,
                        fieldId: 'custentity_dsc_cus_password',
                        value: password
                    };
                    if (crypto.checkPasswordField(options)) {
                        let stringId = makeId(40);

                        // set the string on customer record

                        let submitString = record.submitFields({
                            type: record.Type.CUSTOMER,
                            id: customerId,
                            values: {
                                'custentity_dsc_cus_generate_string': stringId,
                            }
                        });

                        return {
                            status: '200',
                            data: {
                                customerId: customerId,
                                token: stringId,
                            },
                        };
                    } else {
                        return {
                            status: '404',
                            data: {
                                message: 'Invalid username or password'
                            }
                        };
                    }
                }
            } else {
                return {
                    status: '404',
                    data: {
                        message: 'Invalid username or password'
                    }
                };
            }


        } catch (error) {
            log.error({
                title: title + 'Error',
                details: error,
            })
            return {
                status: '500',
                data: {
                    message: 'Internal Server Error',
                }
            }
        }
    }
    const displayTable = (customerResponedId, customerToken) => {
        const title = 'displayTable ::';
        try {
            log.debug({
                title: title,
                details: title,
            });
            let customerDetialRecord = record.load({
                type: record.Type.CUSTOMER,
                id: customerResponedId
            });
            let savedToken = customerDetialRecord.getValue({
                fieldId: 'custentity_dsc_cus_generate_string',
            });
            log.debug({
                title: title + 'savedToken',
                details: savedToken,
            });
            if (customerToken == savedToken) {
                let customerData = getData(customerResponedId);
                log.debug({
                    title: title + 'customerData',
                    details: customerData,
                });
                return {
                    status: '200',
                    data: {
                        customerRecord: customerData,
                    },
                }
            } else {
                return {
                    status: '401',
                    data: {
                        message: "You are not AUTHORIZED",
                    }
                }
            }
        } catch (error) {
            log.error({
                title: title + 'Error',
                details: error,
            });
        }
    }
    const displayGraph = (customerResponedId, customerToken) => {
        const title = 'displayGraph ::';
        try {
            log.debug({
                title: title,
                details: title,
            });
            let customerDetialRecord = record.load({
                type: record.Type.CUSTOMER,
                id: customerResponedId
            });
            let savedToken = customerDetialRecord.getValue({
                fieldId: 'custentity_dsc_cus_generate_string',
            });
            log.debug({
                title: title + 'savedToken',
                details: savedToken,
            });
            if (customerToken == savedToken) {
                let customerDisplayGraph = getGraph(customerResponedId);
                log.debug({
                    title: title + 'customerDisplayGraph',
                    details: customerDisplayGraph,
                });
                return {
                    status: '200',
                    data: {
                        customerRecord: customerDisplayGraph,
                    },
                }
            } else {
                return {
                    status: '401',
                    data: {
                        message: "You are not AUTHORIZED",
                    }
                }
            }
        } catch (error) {
            log.error({
                title: title + 'Error',
                details: error
            })
        }
    }
    const getGraph = (customerResponedId) => {
        const title = 'getGraph: ';
        try {
            log.debug({
                title: 'title',
                details: title,
            });
            let dateSearch = search.load({
                id: 'customsearch152',
            });
            let defaultFilters = dateSearch.filterExpression;
            let customFilters = [];
            customFilters = ['entity', 'is', customerResponedId];
            defaultFilters.push('AND');
            defaultFilters.push(customFilters);
            dateSearch.filterExpression = defaultFilters;
            let runningSearch = dateSearch.run();
            let searchingRange = runningSearch.getRange({
                start: 0,
                end: 1000,
            });
            let arr = [];
            for (let i = 0; i < searchingRange.length; i++) {
                let searchperiod = searchingRange[i].getValue({
                    name: 'trandate',
                    summary: search.Summary.GROUP
                });
                let searchamount = parseFloat(
                    searchingRange[i].getValue({
                        name: 'amount',
                        summary: search.Summary.SUM
                    })
                );
                let name = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                let date = new Date(searchperiod);
                let month = name[date.getMonth()];
                // log.debug({
                //     title: title + 'Date & Amount:',
                //     details: month + '&' + searchamount,
                // });
                let graphObject = {
                    'Alongx': month,
                    'Alongy': searchamount
                }
                log.debug({
                    title: title + 'graphObject',
                    details: graphObject,
                })
                arr.push(graphObject);
            }
            return arr;
        } catch (error) {
            log.error({
                title: title + 'Error',
                details: error,
            })
        }
    }
    const getData = (customerId) => {
        const title = 'getData';
        log.debug({
            title: title + 'customerId',
            details: customerId,
        })
        try {
            log.debug({
                title: 'Title',
                details: title,
            });
            let mySearch = search.create({
                type: search.Type.SALES_ORDER,
                columns: [
                    search.createColumn({
                        name: 'entity',
                    }),
                    search.createColumn({
                        name: 'internalid',
                    }),
                    search.createColumn({
                        name: 'trandate',
                    }),
                    search.createColumn({
                        name: 'status',
                    }),
                    search.createColumn({
                        name: 'currency',
                    }),
                    search.createColumn({
                        name: 'amount',
                    }),
                ],
                filters: [
                    search.createFilter({
                        name: 'mainline',
                        operator: search.Operator.IS,
                        values: false,
                    }),
                    search.createFilter({
                        name: 'entity',
                        operator: search.Operator.IS,
                        values: customerId,
                    })
                ],
            });
            let runningSearch = mySearch.run();
            let searchingRange = runningSearch.getRange({
                start: 0,
                end: 1000,
            });
            arr = [];
            for (let i = 0; i < searchingRange.length; i++) {
                let soId = searchingRange[i].getValue({
                    name: 'internalid',
                });
                let soDate = searchingRange[i].getValue({
                    name: 'trandate',
                    sort: search.Sort.ASC,
                });
                let soStatus = searchingRange[i].getValue({
                    name: 'status',
                });
                let soCurrency = searchingRange[i].getText({
                    name: 'currency',
                });
                let soAmount = parseFloat(
                    searchingRange[i].getValue({
                        name: 'amount',
                    })
                );
                var obj = {
                    'internalid': soId,
                    'trandate': soDate,
                    "status": soStatus,
                    "currency": soCurrency,
                    'amount': soAmount,
                };
                arr.push(obj);
            }
            log.debug({
                title: title + 'Array',
                details: arr,
            });
            return arr;
        } catch (error) {
            log.error({
                title: title + 'Error',
                details: error,
            });
        }
    }
    const makeId = (length) => {
        let result = '';
        let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() *
                charactersLength));
        }
        return result;
    }
    const getPageContent = (fileId) => {

        const title = 'getLoginPageContent :: ';
        try {
            const loginFile = file.load({
                id: fileId
            });
            if (loginFile) {
                const contents = loginFile.getContents();
                log.debug({
                    title: `${title} contents`,
                    details: contents
                });


                return contents;
            }
        } catch (error) {
            log.error({
                title: title + 'error',
                details: error
            })
        }
    }

    const getScriptParams = () => {
        const title = 'getScriptParams :: ';
        try {
            const scriptObj = runtime.getCurrentScript();
            const params = {
                loginFileId: scriptObj.getParameter({
                    name: 'custscript_dsc_login_file_id'
                }),
                dashboardFileId: scriptObj.getParameter({
                    name: 'custscript_dsc_dashboard_field_id',
                }),
                cssLinksStr: scriptObj.getParameter({
                    name: 'custscript_dsc_css_file_links',
                }),
                logoPng: scriptObj.getParameter({
                    name: 'custscript_dsc_portal_logo',
                })
            };
            return params;
        } catch (error) {
            log.error({
                title: title + 'error',
                details: error
            })
        }
    }
    return {
        onRequest: onRequest,
    }
});