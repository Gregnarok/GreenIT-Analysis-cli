const fs = require('fs');
const path = require('path');
const ProgressBar = require('progress');
const TemplateEngine = require('thymeleaf');
const translator = require('./translator.js').translator;

async function create_json_report(reportObject,options){
    console.log(options);
    const OUTPUT_FILE = path.resolve(options.report_output_file);
    const fileList = reportObject.reports;
    const globalReport = reportObject.globalReport;

    //initialise progress bar
    let progressBar;
    if (!options.ci){
        progressBar = new ProgressBar(' Create JSON report       [:bar] :percent     Remaining: :etas     Time: :elapseds', {
            complete: '=',
            incomplete: ' ',
            width: 40,
            total: fileList.length+2
        });
        progressBar.tick()
    } else {
        console.log('Creating JSON report ...');
    }
    
    // Read all reports
    const allReportsVariables = readAllReports(fileList);

    // Read global report
    const globalReportVariables = readGlobalReport(globalReport.path, allReportsVariables);
    fs.writeFileSync(OUTPUT_FILE,JSON.stringify(globalReportVariables,null,3));
}

function readAllReports(fileList) {
    let allReportsVariables = [];
    let reportVariables = {};
    fileList.forEach((file)=>{
        let report_data = JSON.parse(fs.readFileSync(file.path).toString());
        const pageName = report_data.pageInformations.name || report_data.pageInformations.url;
        const pageFilename = report_data.pageInformations.name ? `${removeForbiddenCharacters(report_data.pageInformations.name)}.json` : `${report_data.index}.json`;

        if (report_data.success) {
            let bestPractices = extractBestPractices(report_data.bestPractices);
            reportVariables = {
                date: report_data.date,
                success: report_data.success,
                name: pageName,
                filename: pageFilename,
                ecoIndex: report_data.ecoIndex,
                grade: report_data.grade,
                waterConsumption: report_data.waterConsumption,
                greenhouseGasesEmission: report_data.greenhouseGasesEmission,
                nbRequest: report_data.nbRequest,
                pageSize: Math.round(report_data.responsesSize / 1000),
                uncompressPageSize: Math.round(report_data.responsesSizeUncompress / 1000),
                domSize: report_data.domSize,
                nbBestPracticesToCorrect: report_data.nbBestPracticesToCorrect,
                bestPractices
            };
        } else {
            reportVariables = {
                date: report_data.date,
                success: report_data.success,
                name: pageName,
                filename: pageFilename,
                bestPractices: []
            }
        }
        allReportsVariables.push(reportVariables);
    });
    return allReportsVariables;
}

function readGlobalReport(path, allReportsVariables) {
    console.log(path)
    let globalReport_data = JSON.parse(fs.readFileSync(path).toString());
    console.log(globalReport_data)
    const hasWorstRules = globalReport_data.worstRules?.length > 0 ? true : false;
    const globalReportVariables = {
        date: globalReport_data.date,
        hostname: globalReport_data.hostname,
        device: globalReport_data.device,
        connection: globalReport_data.connection,
        ecoIndex: globalReport_data.ecoIndex,
        grade: globalReport_data.grade,
        nbBestPracticesToCorrect: globalReport_data.nbBestPracticesToCorrect,
        nbPages: globalReport_data.nbPages,
        nbErrors: globalReport_data.errors.length,
        allReportsVariables,
        worstRules: hasWorstRules ? globalReport_data.worstRules.map((worstRule, index) => `#${index+1} ${translator.translateRule(worstRule)}`) : '',
    };
    return globalReportVariables;
}

function extractBestPractices(bestPracticesFromReport) {
    const bestPracticesKey = [
        'AddExpiresOrCacheControlHeaders',
        'CompressHttp',
        'DomainsNumber',
        'DontResizeImageInBrowser',
        'EmptySrcTag',
        'ExternalizeCss',
        'ExternalizeJs',
        'HttpError',
        'HttpRequests',
        'ImageDownloadedNotDisplayed',
        'JsValidate',
        'MaxCookiesLength',
        'MinifiedCss',
        'MinifiedJs',
        'NoCookieForStaticRessources',
        'NoRedirect',
        'OptimizeBitmapImages',
        'OptimizeSvg',
        'Plugins',
        'PrintStyleSheet',
        'SocialNetworkButton',
        'StyleSheets',
        'UseETags',
        'UseStandardTypefaces'
    ];

    let bestPractices = [];

    bestPracticesKey.forEach(key => {
        const bestPractice = {
            name: translator.translateRule(key),
            comment: bestPracticesFromReport[key].comment || '',
            note: bestPracticesFromReport[key].complianceLevel || 'A'
        };
        bestPractices.push(bestPractice);
    })

    return bestPractices;
}

function removeForbiddenCharacters(str) {
    str = removeForbiddenCharactersInFile(str);
    str = removeAccents(str);
    return str;
}

function removeForbiddenCharactersInFile(str) {
    return str.replace(/[/\\?%*:|"<>° ]/g, '');
}

function removeAccents(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

module.exports = {
    create_json_report
}
