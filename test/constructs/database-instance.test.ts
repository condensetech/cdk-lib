import * as cdk from 'aws-cdk-lib';
import { aws_rds as rds } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Template } from 'aws-cdk-lib/assertions';
import { DatabaseInstance } from '../../lib/constructs/database-instance';
import { Networking } from '../../lib/constructs/networking';

describe('Constructs/DatabaseInstance', () => {
  test('Creates a single RDS Instance', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    const network = new Networking(stack, 'Networking', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      vpcName: 'TestVpc',
    });
    new DatabaseInstance(stack, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_2,
      }),
      vpc: network.vpc,
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      DBInstanceClass: 'db.t3.small',
      Engine: 'postgres',
      EngineVersion: '15.2',
      AllocatedStorage: '20',
      StorageType: 'gp3',
      MultiAZ: false,
      StorageEncrypted: true,
    });
  });

  test('Can use a different engine', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    const network = new Networking(stack, 'Networking', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      vpcName: 'TestVpc',
    });
    new DatabaseInstance(stack, 'Database', {
      engine: rds.DatabaseInstanceEngine.mariaDb({
        version: rds.MariaDbEngineVersion.VER_10_6_8,
      }),
      vpc: network.vpc,
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      Engine: 'mariadb',
      EngineVersion: '10.6.8',
    });
  });

  test('Can change the allocated storage', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    const network = new Networking(stack, 'Networking', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      vpcName: 'TestVpc',
    });
    new DatabaseInstance(stack, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_2,
      }),
      vpc: network.vpc,
      allocatedStorage: 100,
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      AllocatedStorage: '100',
    });
  });

  test('Can change the backup retention', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    const network = new Networking(stack, 'Networking', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      vpcName: 'TestVpc',
    });
    new DatabaseInstance(stack, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_2,
      }),
      vpc: network.vpc,
      backupRetention: cdk.Duration.days(7),
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      BackupRetentionPeriod: 7,
    });
  });

  test('Can change the instance type', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    const network = new Networking(stack, 'Networking', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      vpcName: 'TestVpc',
    });
    new DatabaseInstance(stack, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_2,
      }),
      vpc: network.vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      DBInstanceClass: 'db.t3.micro',
    });
  });

  test('Can define the credentials secret name', () => {
    const app = new cdk.App();
    const stack = new cdk.Stack(app, 'TestStack');
    const network = new Networking(stack, 'Networking', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      vpcName: 'TestVpc',
    });
    new DatabaseInstance(stack, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_15_2,
      }),
      vpc: network.vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      credentialsSecretName: 'TestSecret',
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'TestSecret',
    });
  });
});