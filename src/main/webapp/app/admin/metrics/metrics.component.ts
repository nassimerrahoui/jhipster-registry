import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { JhiMetricsService } from './metrics.service';
import { Route } from 'app/shared/routes/route.model';
import { JhiRoutesService } from 'app/shared/routes/routes.service';

@Component({
  selector: 'jhi-metrics',
  templateUrl: './metrics.component.html'
})
export class JhiMetricsMonitoringComponent implements OnInit, OnDestroy {
  metrics: any = {};
  threadData: any = {};
  threadStats: {
    threadDumpRunnable: number;
    threadDumpWaiting: number;
    threadDumpTimedWaiting: number;
    threadDumpBlocked: number;
    threadDumpAll: number;
  };
  updatingMetrics = true;
  JCACHE_KEY: string;

  activeRoute: Route;
  subscription: Subscription;

  constructor(private modalService: NgbModal, private metricsService: JhiMetricsService, private routesService: JhiRoutesService) {
    this.JCACHE_KEY = 'jcache.statistics';
  }

  ngOnInit() {
    this.subscription = this.routesService.routeChanged$.subscribe(route => {
      this.activeRoute = route;
      this.displayActiveRouteMetrics();
    });
  }

  refresh() {
    this.routesService.reloadRoutes();
  }

  displayActiveRouteMetrics() {
    this.updatingMetrics = true;
    if (this.activeRoute && this.activeRoute.status !== 'DOWN') {
      this.metricsService.getInstanceMetrics(this.activeRoute).subscribe(
        metrics => {
          this.metrics = metrics;
          this.metricsService.instanceThreadDump(this.activeRoute).subscribe(data => {
            this.threadData = data.threads;

            this.threadStats = {
              threadDumpRunnable: 0,
              threadDumpWaiting: 0,
              threadDumpTimedWaiting: 0,
              threadDumpBlocked: 0,
              threadDumpAll: 0
            };

            this.threadData.forEach(value => {
              if (value.threadState === 'RUNNABLE') {
                this.threadStats.threadDumpRunnable += 1;
              } else if (value.threadState === 'WAITING') {
                this.threadStats.threadDumpWaiting += 1;
              } else if (value.threadState === 'TIMED_WAITING') {
                this.threadStats.threadDumpTimedWaiting += 1;
              } else if (value.threadState === 'BLOCKED') {
                this.threadStats.threadDumpBlocked += 1;
              }
            });

            this.threadStats.threadDumpAll =
              this.threadStats.threadDumpRunnable +
              this.threadStats.threadDumpWaiting +
              this.threadStats.threadDumpTimedWaiting +
              this.threadStats.threadDumpBlocked;

            this.updatingMetrics = false;
          });
        },
        error => {
          if (error.status === 503 || error.status === 500 || error.status === 404) {
            if (error.status === 500 || error.status === 404) {
              this.routesService.routeDown(this.activeRoute);
            }
          }
        }
      );
    } else {
      this.routesService.routeDown(this.activeRoute);
    }
  }

  isObjectExisting(metrics: any, key: string) {
    return metrics && metrics[key];
  }

  isObjectExistingAndNotEmpty(metrics: any, key: string) {
    return this.isObjectExisting(metrics, key) && JSON.stringify(metrics[key]) !== '{}';
  }

  ngOnDestroy() {
    // prevent memory leak when component destroyed
    this.subscription.unsubscribe();
  }
}
