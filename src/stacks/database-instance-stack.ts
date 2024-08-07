import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2, aws_secretsmanager as sm, aws_rds as rds } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DatabaseInstance, DatabaseInstanceProps } from '../constructs';
import { MonitoringFacade, MonitoringFacadeProps } from '../constructs/monitoring/monitoring-facade';
import { IDatabase } from '../interfaces';

/**
 * Properties for the DatabaseInstanceStack.
 */
export interface DatabaseInstanceStackProps extends DatabaseInstanceProps, cdk.StackProps {
  /**
   * The monitoring configuration to apply to this stack.
   * @default - No monitoring.
   */
  readonly monitoring?: MonitoringFacadeProps;
}

/**
 * The DatabaseInstanceStack creates a [DatabaseInstance](#@condensetech/cdk-constructs.DatabaseInstance) construct and optionally defines the monitoring configuration.
 * It implements the IDatabase interface so that it can be used in other constructs and stacks without requiring to access to the underlying construct.
 */
export class DatabaseInstanceStack extends cdk.Stack implements IDatabase {
  /**
   * Underlying DatabaseInstance construct.
   */
  readonly resource: DatabaseInstance;

  constructor(scope: Construct, id: string, props: DatabaseInstanceStackProps) {
    super(scope, id, props);
    this.resource = new DatabaseInstance(this, 'Database', props);
    if (props.monitoring) {
      new MonitoringFacade(this, props.monitoring);
    }
  }

  get endpoint(): rds.Endpoint {
    return this.resource.endpoint;
  }

  get connections(): ec2.Connections {
    return this.resource.connections;
  }

  public fetchSecret(scope: Construct, id?: string | undefined): sm.ISecret {
    return this.resource.fetchSecret(scope, id);
  }
}
