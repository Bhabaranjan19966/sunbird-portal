'use strict';

/**
 * @ngdoc function
 * @name playerApp.controller:PreviewContentController
 * @description
 * @author Anuj Gupta
 * # PreviewContentController
 * Controller of the playerApp
 */

angular.module('playerApp')
    .controller('PreviewContentController', ['$stateParams', 'playerTelemetryUtilsService',
        '$rootScope', '$state', 'contentService', '$timeout', 'config',
        'toasterService', function ($stateParams, playerTelemetryUtilsService, $rootScope,
             $state, contentService, $timeout, config, toasterService) {
            var previewContent = this;
            previewContent.contentProgress = 0;
            previewContent.contentId = $stateParams.contentId;
            previewContent.userId = $rootScope.userId;
            previewContent.isShowPublishRejectButton =
                                    $stateParams.backState === 'WorkSpace.UpForReviewContent';
            previewContent.isShowDeleteButton =
                                    $stateParams.backState === 'WorkSpace.PublishedContent';
            previewContent.isShowFlagActionButton =
                                    $stateParams.backState === 'WorkSpace.FlaggedContent';
            previewContent.message = $rootScope.errorMessages.WORKSPACE;

            var validateModal = {
                state: ['WorkSpace.UpForReviewContent', 'WorkSpace.ReviewContent',
                    'WorkSpace.PublishedContent', 'WorkSpace.FlaggedContent'],
                status: ['Review', 'Live', 'Flagged'],
                mimeType: config.MimeTypeExceptCollection
            };

            function checkContentAccess(reqData, validateData) {
                var status = reqData.status;
                var createdBy = reqData.createdBy;
                var state = reqData.state;
                var userId = reqData.userId;
                var validateDataStatus = validateData.status;
                var isMime = _.indexOf(validateData.mimeType, reqData.mimeType) > -1;
                if (isMime) {
                    var isStatus = _.indexOf(validateDataStatus, status) > -1;
                    var isState = _.indexOf(validateData.state, state) > -1;
                    if (isStatus && isState && createdBy !== userId) {
                        return true;
                    } else if (isStatus && isState && createdBy === userId) {
                        return true;
                    } else if (isStatus && createdBy === userId) {
                        return true;
                    }
                    return false;
                }
                return false;
            }

            function showPlayer(data) {
                var rspData = data;
                rspData.state = $stateParams.backState;
                rspData.userId = $rootScope.userId;

                if (!checkContentAccess(rspData, validateModal)) {
                    toasterService
                    .warning($rootScope.errorMessages.COMMON.UN_AUTHORIZED);
                    $state.go('Home');
                }
                previewContent.contentData = data;
                previewContent._instance = {
                    id: previewContent.contentData.identifier,
                    ver: previewContent.contentData.pkgVersion
                };

                /**
                 * @event 'sunbird:portal:telemetryend'
                 * Listen for this event to get the telemetry OE_END event from renderer
                 * Player controller dispatching the event subird
                 */
                window.addEventListener('renderer:telemetry:event', function (event) {
                    org.sunbird.portal.eventManager.dispatchEvent('sunbird:player:telemetry',
                                                                    event.detail.telemetryData);
                });

                window.onbeforeunload = function () {
                    playerTelemetryUtilsService.endTelemetry({
                        progress: previewContent.contentProgress
                    });
                };
                previewContent.showIFrameContent = true;
                var iFrameSrc = config.ekstep_CP_config.baseURL;
                $timeout(function () {
                    var previewContentIframe = $('#contentViewerIframe')[0];
                    previewContentIframe.src = iFrameSrc;
                    previewContentIframe.onload = function () {
                        var configuration = {};
                        configuration.context = config.ekstep_CP_config.context;
                        configuration.context.contentId = previewContent.contentData.identifier;
                        configuration.context.sid = $rootScope.sessionId;
                        configuration.context.uid = $rootScope.userId;
                        configuration.context.channel = org.sunbird.portal.channel;
                        if (_.isUndefined($stateParams.courseId)) {
                            configuration.context.dims = org.sunbird.portal.dims;
                        } else {
                            var cloneDims = _.cloneDeep(org.sunbird.portal.dims);
                            cloneDims.push($stateParams.courseId);
                            configuration.context.dims = cloneDims;
                        }
                        configuration.context.app = [org.sunbird.portal.appid];
                        configuration.context.partner = [];
                        configuration.context.cdata = [{
                            id: $stateParams.courseId,
                            type: 'course'
                        }];
                        configuration.config = config.ekstep_CP_config.config;
                        configuration.config.plugins = config.ekstep_CP_config.config.plugins;
                        configuration.config.repos = config.ekstep_CP_config.config.repos;
                        configuration.metadata = previewContent.contentData;
                        if (previewContent.contentData.mimeType !== config.MIME_TYPE.ecml) {
                            configuration.data = {};
                        }
                        previewContentIframe.contentWindow.initializePreview(configuration);
                    };
                }, 1000);
            }

            function showLoaderWithMessage(showMetaLoader, messageClass, message, closeButton, tryAgainButton) { //eslint-disable-line
                var error = {};
                error.showError = true;
                error.showMetaLoader = showMetaLoader;
                error.messageClass = messageClass;
                error.message = message;
                error.showCloseButton = closeButton;
                error.showTryAgainButton = tryAgainButton;
                previewContent.errorObject = error;
            }

            function getContent(contentId) {
                var req = { contentId: contentId };
                var qs = {
                    fields: 'name,description,appIcon,contentType,mimeType,artifactUrl,' +
                            ',versionKey,audience,language,gradeLevel,ageGroup,subject,' +
                            'medium,author,domain,createdBy,flagReasons,flaggedBy,flags,status,' +
                            'createdOn,lastUpdatedOn,body'
                };

                contentService.getById(req, qs).then(function (response) {
                    if (response && response.responseCode === 'OK') {
                        previewContent.errorObject = {};
                        showPlayer(response.result.content);
                    } else {
                        var message = $rootScope.errorMessages.COMMON.UNABLE_TO_PLAY;
                        showLoaderWithMessage(false, 'red', message, true, true);
                    }
                }).catch(function () {
                    var message = $rootScope.errorMessages.COMMON.UNABLE_TO_PLAY;
                    showLoaderWithMessage(false, 'red', message, true, true);
                });
            }

            previewContent.closePreview = function () {
                previewContent.errorObject = {};
                playerTelemetryUtilsService.endTelemetry({
                    progress: previewContent.contentProgress
                });
                window.removeEventListener('renderer:telemetry:event', function () {});
                $state.go($stateParams.backState);
            };

            previewContent.tryAgain = function () {
                previewContent.errorObject = {};
                getContent(previewContent.contentId);
            };

            getContent(previewContent.contentId);

            previewContent.publishContent = function () {
                var request = {
                    content: {
                        lastPublishedBy: previewContent.userId
                    }
                };
                previewContent.loader = toasterService.loader('', previewContent.message
                                                      .PUBLISH_CONTENT.START);

                contentService.publish(request, previewContent.contentId).then(function (res) {
                    if (res && res.responseCode === 'OK') {
                        previewContent.loader.showLoader = false;
                        previewContent.isShowPublishRejectButton = false;
                        previewContent.contentData.status = 'Live';
                        toasterService.success(previewContent.message.PUBLISH_CONTENT.SUCCESS);
//                $state.go("WorkSpace.UpForReviewContent")
                    } else {
                        previewContent.loader.showLoader = false;
                        toasterService.error(previewContent.message.PUBLISH_CONTENT.FAILED);
                    }
                }).catch(function () {
                    previewContent.loader.showLoader = false;
                    toasterService.error(previewContent.message.PUBLISH_CONTENT.FAILED);
                });
            };

            previewContent.rejectContent = function () {
                previewContent.loader = toasterService.loader('', previewContent.message
                                                            .REJECT_CONTENT.START);

                var request = {};
                contentService.reject(request, previewContent.contentId).then(function (res) {
                    if (res && res.responseCode === 'OK') {
                        previewContent.loader.showLoader = false;
                        previewContent.isShowPublishRejectButton = false;
                        toasterService.success(previewContent.message.REJECT_CONTENT.SUCCESS);
//                $state.go("WorkSpace.UpForReviewContent");
                    } else {
                        previewContent.loader.showLoader = false;
                        toasterService.error(previewContent.message.REJECT_CONTENT.FAILED);
                    }
                }).catch(function () {
                    previewContent.loader.showLoader = false;
                    toasterService.error(previewContent.message.REJECT_CONTENT.FAILED);
                });
            };

            previewContent.deleteContent = function () {
                previewContent.loader = toasterService.loader('', previewContent.message
                                                        .RETIRE_CONTENT.START);
                var request = {
                    contentIds: [previewContent.contentId]
                };
                contentService.retire(request).then(function (res) {
                    if (res && res.responseCode === 'OK') {
                        $timeout(function () {
                            previewContent.loader.showLoader = false;
                            previewContent.isShowDeleteButton = false;
                            previewContent.isShowFlagActionButton = false;
                            toasterService.success(previewContent.message.RETIRE_CONTENT.SUCCESS);
                            $state.go($stateParams.backState);
                        }, 2000);
                    } else {
                        previewContent.loader.showLoader = false;
                        toasterService.error(previewContent.message.RETIRE_CONTENT.FAILED);
                    }
                }).catch(function () {
                    previewContent.loader.showLoader = false;
                    toasterService.error(previewContent.message.RETIRE_CONTENT.FAILED);
                });
            };

            previewContent.acceptContentFlag = function (contentData) {
                var request = {
                    versionKey: contentData.versionKey
                };
                previewContent.loader = toasterService.loader('', previewContent.message
                                                  .ACCEPT_CONTENT_FLAG.START);

                contentService.acceptContentFlag(request, contentData.identifier).then(function (res) {
                    if (res && res.responseCode === 'OK') {
                        previewContent.loader.showLoader = false;
                        previewContent.isShowFlagActionButton = false;
                        previewContent.contentData.status = 'FlagDraft';
                        toasterService.success(previewContent.message.ACCEPT_CONTENT_FLAG.SUCCESS);
                        //     $state.go($stateParams.backState);
                    } else {
                        previewContent.loader.showLoader = false;
                        toasterService.error(previewContent.message.ACCEPT_CONTENT_FLAG.FAILED);
                    }
                }).catch(function () {
                    previewContent.loader.showLoader = false;
                    toasterService.error(previewContent.message.ACCEPT_CONTENT_FLAG.FAILED);
                });
            };

            previewContent.discardContentFlag = function (contentData) {
                var request = { };
                previewContent.loader = toasterService.loader('', previewContent.message
                                                     .DISCARD_CONTENT_FLAG.START);

                contentService.discardContentFlag(request, contentData.identifier).then(function (res) {
                    if (res && res.responseCode === 'OK') {
                        previewContent.loader.showLoader = false;
                        previewContent.isShowFlagActionButton = false;
                        previewContent.contentData.status = 'Live';
                        toasterService.success(previewContent.message.DISCARD_CONTENT_FLAG.SUCCESS);
                        //     $state.go($stateParams.backState);
                    } else {
                        previewContent.loader.showLoader = false;
                        toasterService.error(previewContent.message.DISCARD_CONTENT_FLAG.FAILED);
                    }
                }).catch(function () {
                    previewContent.loader.showLoader = false;
                    toasterService.error(previewContent.message.DISCARD_CONTENT_FLAG.FAILED);
                });
            };

            previewContent.getConceptsNames = function (concepts) {
                var conceptNames = _.map(concepts, 'name').toString();
                if (conceptNames.length < concepts.length) {
                    var filteredConcepts = _.filter($rootScope.concepts, function (p) {
                        return _.includes(concepts, p.identifier);
                    });
                    conceptNames = _.map(filteredConcepts, 'name').toString();
                }
                return conceptNames;
            };
        }]);
