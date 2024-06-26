import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { INetworking } from '../interfaces';

export interface NetworkingProps {
  readonly ipAddresses: ec2.IIpAddresses;
  readonly vpcName?: string;
  readonly natGateways?: number;
  readonly bastionName?: string;
  readonly bastionHostEnabled?: boolean;
  readonly bastionHostAmi?: ec2.IMachineImage;
  readonly bastionHostInstanceType?: ec2.InstanceType;
  readonly maxAzs?: number;
}

export class Networking extends Construct implements INetworking {
  readonly vpc: ec2.Vpc;
  readonly bastionHost?: ec2.BastionHostLinux;
  readonly hasPrivateSubnets: boolean;

  constructor(scope: Construct, id: string, props: NetworkingProps) {
    super(scope, id);

    this.hasPrivateSubnets = props.natGateways !== 0;
    this.vpc = this.buildVpc(props);
    if (props.bastionHostEnabled) {
      this.bastionHost = new ec2.BastionHostLinux(scope, 'Bastion', {
        vpc: this.vpc,
        instanceName: props.bastionName ?? (props.vpcName ? `${props.vpcName}-bastion` : undefined),
        machineImage:
          props.bastionHostAmi ??
          ec2.MachineImage.latestAmazonLinux2023({
            cpuType: ec2.AmazonLinuxCpuType.ARM_64,
          }),
        instanceType:
          props.bastionHostInstanceType ??
          ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.NANO),
        subnetSelection: this.privateSubnets ?? this.publicSubnets,
      });
      cdk.Tags.of(this.bastionHost.instance).add('Resource', 'Bastion');
    }
  }

  get publicSubnets(): ec2.SubnetSelection {
    return { subnetType: ec2.SubnetType.PUBLIC };
  }

  get privateSubnets(): ec2.SubnetSelection | undefined {
    if (!this.hasPrivateSubnets) {
      return undefined;
    }
    return { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS };
  }

  get isolatedSubnets(): ec2.SubnetSelection {
    return { subnetType: ec2.SubnetType.PRIVATE_ISOLATED };
  }

  private buildVpc(props: NetworkingProps) {
    const subnetConfiguration: ec2.SubnetConfiguration[] = [
      {
        cidrMask: 24,
        name: 'public',
        subnetType: ec2.SubnetType.PUBLIC,
      },
      {
        cidrMask: 24,
        name: 'isolated',
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
    ];
    if (this.hasPrivateSubnets) {
      subnetConfiguration.push({
        cidrMask: 24,
        name: 'private',
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      });
    }
    return new ec2.Vpc(this, 'VPC', {
      ipAddresses: props.ipAddresses,
      vpcName: props.vpcName,
      subnetConfiguration,
      natGateways: props.natGateways,
      maxAzs: props.maxAzs,
    });
  }
}
