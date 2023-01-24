class ProcessPaymentUseCase {
  constructor(
    private _paymentRepository: IPaymentRepository,
    private _paymentProvidersFactory: IPaymentProvidersFactory,
) {}

  public async execute({ paymentId }: { paymentId: number }): Promise<any> {
    const payment = await this._paymentRepository.getById(paymentId);
    let paymentProviderEnum = this.getPaymentGatewayDecidersChain().decide(payment);
    const paymentProvider = this._paymentProvidersFactory.create(paymentProviderEnum);
    await paymentProvider.process(payment);
    // ... 
    return { /* ... */ };
  }

  private getPaymentGatewayDecidersChain = (): PaymentGatewayDecider => PaymentDeciderBuilder.init()
    .addPaymentDecider(new IsPreferablePagSeguroSpecification(), PaymentProviders.PagSeguro)
    .addPaymentDecider(new IsPreferablePagarMeSpecification(), PaymentProviders.Pagarme)
    .addPaymentDecider(new IsPreferableStripeMeSpecification(), PaymentProviders.Stripe)
    .build();
}

class PaymentDeciderBuilder {
  private _lastDecider: PaymentGatewayDecider;
  private constructor() {};

  public static init = () => new PaymentDeciderBuilder();

  public addPaymentDecider(specification: IIsPreferablePaymentGatewaySpecification, provider: PaymentProviders) {
    const newDecider = new PaymentGatewayDecider(specification, provider);
    this._lastDecider.addNext(newDecider);
    this._lastDecider = newDecider;
    return this;
  }

  public build = () => this._lastDecider;
}

enum PaymentProviders {
  Default = 'Default',
  PagSeguro = 'PagSeguro',
  MercadoPago = 'MercadoPago',
  PayPal = 'PayPal',
  Stripe = 'Stripe',
  Pagarme = 'Pagarme',
}

interface IPaymentProvidersFactory {
  create(provider: PaymentProviders);
};

interface IPaymentRepository {
    getById(id: number): Promise<Payment>;
}

class PaymentGatewayDecider implements IPaymentGatewayDecider {
  constructor(
    private _specification: IIsPreferablePaymentGatewaySpecification,
    private _provider: PaymentProviders,
    private next: PaymentGatewayDecider | null = null) {}

  addNext(next: PaymentGatewayDecider) {
    this.next = next;
  }

  decide(payment: Payment): PaymentProviders {
    if(this._specification.isSatisfiedBy(payment)) return this._provider;
    return this.next?.decide(payment) ?? PaymentProviders.Default;
  }
}

interface IPaymentGatewayDecider {
  decide(payment: Payment): PaymentProviders;
}

interface ISpecification<T> { isSatisfiedBy(target: T): boolean; }

interface IIsPreferablePaymentGatewaySpecification extends ISpecification<Payment> {};

class IsPreferablePagSeguroSpecification implements IIsPreferablePaymentGatewaySpecification {
    isSatisfiedBy(payment: Payment): boolean { return true; }
}

class IsPreferablePagarMeSpecification implements IIsPreferablePaymentGatewaySpecification {
  isSatisfiedBy(payment: Payment): boolean { return true; }
}

class IsPreferableStripeMeSpecification implements IIsPreferablePaymentGatewaySpecification {
  isSatisfiedBy(payment: Payment): boolean { return true; }
}

class Payment {}
