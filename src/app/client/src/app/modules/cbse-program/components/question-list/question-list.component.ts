import { Component, OnInit, AfterViewInit, Output, EventEmitter, Input, ChangeDetectorRef, OnChanges } from '@angular/core';
import { ConfigService, ToasterService, IUserData } from '@sunbird/shared';
import { UserService, PublicDataService, ActionService } from '@sunbird/core';
import { tap, map } from 'rxjs/operators';
import * as _ from 'lodash-es';
import { of } from 'rxjs';
@Component({
  selector: 'app-question-list',
  templateUrl: './question-list.component.html',
  styleUrls: ['./question-list.component.css']
})
export class QuestionListComponent implements OnInit,OnChanges{
  @Input() selectedAttributes: any;
  @Input() role: any;

  public questionList = [];
  public selectedQuestionId: any;
  public questionReadApiDetails: any = {};
  public questionMetaData: any;
  public refresh = true;
  public showLoader = true;
  public enableRoleChange: boolean = false;
  constructor(private configService: ConfigService, private userService: UserService, private publicDataService: PublicDataService,
    public actionService: ActionService, private cdr: ChangeDetectorRef, public toasterService: ToasterService) {
  }
  ngOnChanges(changedProps: any){

    // console.log('changes detected in question list',this.role);
    if(this.enableRoleChange){
      this.fetchQuestionWithRole()
    }
  }
  ngOnInit() {
    this.fetchQuestionWithRole()
    this.enableRoleChange = true;
  }
  private fetchQuestionWithRole(){
    (this.role.currentRole == "REVIEWER") ? this.fetchQuestionList(true): this.fetchQuestionList();
  }
  private fetchQuestionList(isReviewer?: boolean ) {
    const req = {
      url: `${this.configService.urlConFig.URLS.COMPOSITE.SEARCH}`,
      data: {
        'request': {
          'filters': {
            'objectType': 'AssessmentItem',
            'board': this.selectedAttributes.board,
            'framework': this.selectedAttributes.framework,
            'gradeLevel': this.selectedAttributes.gradeLevel,
            'subject': this.selectedAttributes.subject,
            'medium': this.selectedAttributes.medium,
            'type': this.selectedAttributes.questionType === 'mcq' ? 'mcq' : 'reference',
            'category': this.selectedAttributes.questionType.toUpperCase(),
            'topic': this.selectedAttributes.topic,
            'createdBy': this.userService.userid,
            'programId': this.selectedAttributes.programId,
            'version': 3,
            'status': []
          },
          'sort_by': { 'createdOn': 'desc' }
        }
      }
    };
    if(isReviewer){
      delete req.data.request.filters.createdBy;
    }
    this.publicDataService.post(req).pipe(tap(data => this.showLoader = false))
    .subscribe((res) => {
      this.questionList = res.result.items || [];
      if (this.questionList.length) {
        this.selectedQuestionId = this.questionList[0].identifier;
        this.handleQuestionTabChange(this.selectedQuestionId);
      }
    }, err => {
      this.toasterService.error(_.get(err, 'error.params.errmsg') || 'Fetching question list failed');
    });
  }
  handleQuestionTabChange(questionId) {
    this.selectedQuestionId = questionId;
    this.showLoader = true;
    this.getQuestionDetails(questionId).pipe(tap(data => this.showLoader = false))
    .subscribe((assessment_item) => {
      let editorMode;
      if (['Draft', 'Review', 'Reject'].includes(assessment_item.status)) {
        editorMode = 'edit';
      } else {
        editorMode = 'view';
      }
      this.questionMetaData = {
        mode: editorMode,
        data: assessment_item
      };
      this.refreshEditor();
    }, err => {
      this.toasterService.error(_.get(err, 'error.params.errmsg') || 'Fetching question failed');
    });
  }
  public getQuestionDetails(questionId) {
    if (this.questionReadApiDetails[questionId]) {
      return of(this.questionReadApiDetails[questionId]);
    }
    const req = {
      url: `${this.configService.urlConFig.URLS.ASSESSMENT.READ}/${questionId}`
    };
    return this.actionService.get(req).pipe(map( res => {
      this.questionReadApiDetails[questionId] = res.result.assessment_item;
      return res.result.assessment_item;
    }));
  }
  public createNewQuestion(): void {
    this.questionMetaData = {
      mode: 'create'
    };
    this.refreshEditor();
  }
  public questionStatusHandler(event) {
    
    if (event.type === 'close') {
      this.questionMetaData = {};
      if (this.questionList.length) {
        this.handleQuestionTabChange(this.selectedQuestionId);
      }
      return;
    }
    if (event.status === 'failed') {
      console.log('failed');
    } else {
      if  (event.type === 'update') {
        delete this.questionReadApiDetails[event.identifier];
        this.handleQuestionTabChange(this.selectedQuestionId);
      } else {
        this.showLoader = true;
        setTimeout(() => this.fetchQuestionList(), 2000);
      }
    }
  }

  handleRefresEvent(){
    this.refreshEditor();
  }
  private refreshEditor() {
    this.refresh = false;
    this.cdr.detectChanges();
    this.refresh = true;
  }
}
