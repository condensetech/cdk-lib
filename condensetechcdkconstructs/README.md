# Condense's CDK Constructs

This library contains constructs and stacks we use across our projects.

## Installation

```bash
npm install @condensetech/cdk-constructs
```

## Composable Infrastructure Constructs and Stacks

Readability and maintainability are key factors when writing IaC. By defining some high level interfaces, we can easily write constructs which don't need to be tied to the specific implementation of a resource.

For example, the [INetworking](lib/interfaces.ts), defines some high level methods to interact with a VPC. Often a VPC contains a bastion host, which should be whitelisted to databases, so the interface has a `bastionHost` property which can return the bastion host. This allows to write code like the following:

```go
interface MyDatabaseStackProps extends cdk.StackProps {
  networking: INetworking;
}
class MyDatabaseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MyDatabaseStackProps) {
    super(scope, id, props);

    const db = new rds.DatabaseInstance(this, 'Database', {
      vpc: props.networking.vpc,
      ...
    });
    if (props.networking.bastionHost) {
      db.connections.allowDefaultPortFrom(props.networking.bastionHost);
    }
  }
}
```

If a certain point we want to add a bastion host, we just need to flip one single switch in the networking props, to have the bastion host able to connect to all the resources in the VPC.

Constructs and Stacks in this area:

* [Networking](lib/constructs/networking.ts) and [NetworkingStack](lib/stacks/networking.ts)
* [Aurora Cluster](lib/constructs/aurora-cluster.ts) and [AuroraClusterStack](lib/stacks/aurora-cluster.ts)
* [RDS Instance](lib/constructs/database-instance.ts) and [DatabaseInstanceStack](lib/stacks/database-instance.ts)

## Entrypoint

A typical scenario is to have one single Application Load Balancer in a VPC, which routes traffic to different services. The [Entrypoint Construct](lib/constructs/entrypoint.ts) and the [Entrypoint Stack](lib/stacks/entrypoint-stack.ts) allow to easily define this entrypoint load balancer.

## Cloudwatch Alarms Topic

The [CloudwatchAlarmsTopicStack](lib/stacks/cloudwatch-alarms-topic-stack.ts) creates an SNS Topic which can be used as a target for Cloudwatch Alarms. In addition to link the topic to HTTPS endpoints, it can also create a Lambda function which can be used to send messages to Discord.

## Naive BasicAuth Cloudfront Function

[NaiveBasicAuthCloudfrontFunction](lib/constructs/naive-basic-auth-cloudfront-function.ts) is useful when a basic protection layer must be added to Cloudfront (for SPAs or static sites) and you just need to avoid crawlers and unwanted visitors.

## Monitoring

By instantiating a [MonitoringFacade](lib/constructs/monitoring/monitoring-facade.ts) in your stack, you can easily add monitoring to your resources. The facade will create a Cloudwatch Dashboard, and will add alarms to the resources you want to monitor.