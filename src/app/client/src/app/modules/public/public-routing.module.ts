import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { GetComponent } from './components/get/get.component';
import { DialCodeComponent } from './components/dial-code/dial-code.component';
import { PublicFooterComponent } from './components/public-footer/public-footer.component';
import {
  LandingPageComponent, SignupComponent, PublicContentPlayerComponent,
  PublicCollectionPlayerComponent, ExploreContentComponent
} from './components';

const routes: Routes = [
  {
    path: '', // root path '/' for the app
    component: LandingPageComponent
  },
  {
    path: 'signup', component: SignupComponent, data: {
      telemetry: {
        env: 'signup', pageid: 'signup', type: 'edit', subtype: 'paginate'
      }
    }
  },
  {
    path: 'get', component: GetComponent, data: {
      telemetry: {
        env: 'public', pageid: 'get', type: 'view', subtype: 'paginate'
      }
    }
  },
  {
    path: 'get/dial/:dialCode', component: DialCodeComponent, data: {
      telemetry: {
        env: 'public', pageid: 'get-dial', type: 'view', subtype: 'paginate'
      }
    }
  },
  {
    path: 'play/content/:contentId', component: PublicContentPlayerComponent, data: {
      telemetry: {
        env: 'public', pageid: 'play-content', type: 'view', subtype: 'paginate'
      }
    }
  },
  {
    path: 'play/collection/:collectionId', component: PublicCollectionPlayerComponent, data: {
      telemetry: {
        env: 'public', pageid: 'play-collection', type: 'view', subtype: 'paginate'
      }
    }
  },
  {
    path: 'explore/:pageNumber', component: ExploreContentComponent, data: {
      telemetry: {
        env: 'public', pageid: 'explore', type: 'view', subtype: 'paginate'
      }
    }
  },
  {
    path: ':slug/explore/:pageNumber', component: ExploreContentComponent, data: {
      telemetry: {
        env: 'public', pageid: 'explore', type: 'view', subtype: 'paginate'
      }
    }
  }
];
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PublicRoutingModule { }
