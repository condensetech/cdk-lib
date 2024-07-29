import * as cdk from 'aws-cdk-lib';
import { aws_ec2 as ec2, aws_secretsmanager as sm, aws_rds as rds } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IDatabase, INetworking } from '../interfaces';

/**
 * Properties for the AuroraCluster construct.
 */
export interface AuroraClusterProps {
  /**
   * The networking configuration for the Aurora cluster.
   */
  readonly networking: INetworking;

  /**
   * The engine of the Aurora cluster.
   */
  readonly engine: rds.IClusterEngine;

  /**
   * The name of the cluster. If not specified, it relies on the underlying default naming.
   * @deprecated Use `clusterIdentifier` instead.
   */
  readonly clusterName?: string;

  /**
   * The identifier of the cluster. If not specified, it relies on the underlying default naming.
   */
  readonly clusterIdentifier?: string;

  /**
   * The name of the database.
   * @default - No default database is created.
   */
  readonly databaseName?: string;

  /**
   * The name of the secret that stores the credentials of the database.
   * @default `${construct.node.path}/secret`
   */
  readonly credentialsSecretName?: string;

  /**
   * The backup retention period.
   * @default - It uses the default applied by [rds.DatabaseClusterProps#backup](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.DatabaseClusterProps.html#backup).
   */
  readonly backupRetention?: cdk.Duration;

  /**
   * The writer instance of the Aurora cluster.
   * @default - A provisioned instance with the minimum instance type based on the engine type.
   */
  readonly writer?: rds.IClusterInstance;

  /**
   * The reader instances of the Aurora cluster.
   * @default - No reader instances are created.
   */
  readonly readers?: rds.IClusterInstance[];

  /**
   * The removal policy to apply when the cluster is removed.
   * @default RemovalPolicy.RETAIN
   */
  readonly removalPolicy?: cdk.RemovalPolicy;

  /**
   * The parameters to override in the parameter group.
   * @default - No parameter is overridden.
   */
  readonly parameters?: Record<string, string>;
}

/**
 * The AuroraCluster Construct creates an opinionated Aurora Cluster. Under the hood, it creates a [rds.DatabaseCluster](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds-readme.html#starting-a-clustered-database) construct.
 * It implements the IDatabase interface so that it can be used in other constructs and stacks without requiring to access to the underlying construct.
 *
 * It also applies the following changes to the default behavior:
 * - A [rds.ParameterGroup](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds-readme.html#parameter-groups) specific for the cluster is always defined.
 *   By using a custom parameter group instead of relying on the default one, a later change in the parameter group's parameters wouldn't require a replace of the cluster.
 * - The credentials secret name is created after the construct's path. This way, the secret name is more readable and, when working with multiple stacks, can be easily inferred without having to rely on Cloudformation exports.
 * - The default instance type for the writer instance is set to a minimum instance type based on the engine type.
 * - The storage is always encrypted.
 */
export class AuroraCluster extends Construct implements IDatabase {
  /**
   * Returns the minimum instance type supported by the Aurora cluster based on the engine type.
   * This method is used to set the default instance type for the writer instance if not otherwise specified.
   *
   * @param engine The engine type of the Aurora cluster.
   * @returns The minimum instance type supported by the Aurora cluster based on the engine type.
   */
  protected static minimumInstanceType(engine: rds.IClusterEngine): ec2.InstanceType {
    return engine.engineType === 'aurora-postgresql'
      ? ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MEDIUM)
      : ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.SMALL);
  }

  /**
   * The database cluster.
   */
  protected readonly databaseCluster: rds.IDatabaseCluster;

  readonly endpoint: rds.Endpoint;
  readonly parameterGroup: rds.ParameterGroup;

  constructor(scope: Construct, id: string, props: AuroraClusterProps) {
    super(scope, id);

    this.parameterGroup = new rds.ParameterGroup(this, 'ParameterGroup', {
      engine: props.engine,
      description: this.node.path,
      removalPolicy: props.removalPolicy,
      parameters: props.parameters,
    });

    const backup = props.backupRetention ? { retention: props.backupRetention } : undefined;

    const credentials = rds.Credentials.fromUsername('db_user', {
      secretName: props.credentialsSecretName ?? `${this.node.path}/secret`,
    });

    this.databaseCluster = new rds.DatabaseCluster(this, 'DB', {
      clusterIdentifier: props.clusterIdentifier ?? props.clusterName,
      engine: props.engine,
      credentials,
      writer:
        props.writer ??
        rds.ClusterInstance.provisioned('ClusterInstance', {
          instanceType: AuroraCluster.minimumInstanceType(props.engine),
        }),
      readers: props.readers,
      vpc: props.networking.vpc,
      vpcSubnets: props.networking.isolatedSubnets,
      defaultDatabaseName: props.databaseName,
      parameterGroup: this.parameterGroup,
      storageEncrypted: true,
      backup,
    });
    this.endpoint = this.databaseCluster.clusterEndpoint;
  }

  get connections(): ec2.Connections {
    return this.databaseCluster.connections;
  }

  fetchSecret(scope: Construct, id = 'DatabaseSecret'): sm.ISecret {
    return sm.Secret.fromSecretNameV2(scope, id, `${this.node.path}/secret`);
  }
}
